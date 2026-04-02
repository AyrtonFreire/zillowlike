import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/sms";
import { getAgencyConfigs, getRoutingTargetByIntent } from "@/lib/agency-profile";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

const rateMap = new Map<string, { ts: number[] }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

const PublicAgencyContactSchema = z
  .object({
    intent: z.enum(["BUY", "RENT", "LIST"]),
    name: z.string().trim().min(2).max(120),
    email: z
      .string()
      .trim()
      .email()
      .transform((v) => v.toLowerCase())
      .nullable()
      .optional(),
    phone: z.string().trim().min(6).max(40).nullable().optional(),
    message: z.string().trim().max(2000).nullable().optional(),
    turnstileToken: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Informe e-mail ou telefone para retorno.",
      });
    }
  });

function getIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (req as any).ip || "unknown";
}

function checkRate(ip: string) {
  const now = Date.now();
  const rec = rateMap.get(ip) || { ts: [] };
  rec.ts = rec.ts.filter((t) => now - t < WINDOW_MS);
  if (rec.ts.length >= MAX_REQUESTS) return false;
  rec.ts.push(now);
  rateMap.set(ip, rec);
  return true;
}

async function verifyTurnstile(token?: string, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data: any = await res.json();
    return Boolean(data?.success);
  } catch {
    return false;
  }
}

function formatIntentLabel(intent: "BUY" | "RENT" | "LIST") {
  if (intent === "BUY") return "compra";
  if (intent === "RENT") return "locação";
  return "captação";
}

function appendNotes(current: string | null | undefined, nextBlock: string) {
  const merged = [String(current || "").trim(), nextBlock.trim()].filter(Boolean).join("\n\n");
  return merged.slice(0, 5000) || null;
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string }> | { slug: string } }) {
  try {
    const ip = getIp(req);
    if (!checkRate(ip)) {
      return NextResponse.json({ success: false, error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429 });
    }

    const params = await Promise.resolve(context.params);
    const slug = String(params?.slug || "").trim();
    if (!slug) {
      return NextResponse.json({ success: false, error: "Agência inválida." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = PublicAgencyContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos.", issues: parsed.error.issues }, { status: 400 });
    }

    const session: any = await getServerSession(authOptions).catch(() => null);
    const sessionUserId = session?.userId || session?.user?.id || session?.user?.sub || null;

    if (!sessionUserId) {
      const ok = await verifyTurnstile(parsed.data.turnstileToken, ip);
      if (!ok) {
        return NextResponse.json({ success: false, error: "Captcha inválido." }, { status: 400 });
      }
    }

    const agencyUser = await (prisma as any).user.findFirst({
      where: {
        role: "AGENCY",
        publicProfileEnabled: true,
        publicSlug: String(slug),
      },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        agencyProfile: {
          select: {
            id: true,
            name: true,
            teamId: true,
          },
        },
      },
    });

    const teamId = agencyUser?.agencyProfile?.teamId ? String(agencyUser.agencyProfile.teamId) : null;
    if (!agencyUser?.id || !teamId) {
      return NextResponse.json({ success: false, error: "Agência não encontrada." }, { status: 404 });
    }

    const { profileConfig, leadConfig } = await getAgencyConfigs(teamId);
    const routedUserId =
      getRoutingTargetByIntent(leadConfig, parsed.data.intent) ||
      (profileConfig.primaryAgentUserId ? String(profileConfig.primaryAgentUserId) : null);

    const routedMember = routedUserId
      ? await (prisma as any).teamMember.findFirst({
          where: { teamId, userId: String(routedUserId) },
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : null;

    const email = parsed.data.email !== undefined ? parsed.data.email : null;
    const phone = parsed.data.phone !== undefined ? parsed.data.phone : null;
    const phoneNormalized = phone ? normalizePhoneE164(String(phone)) || null : null;

    const matchClauses = [
      email ? { email: String(email) } : null,
      phoneNormalized ? { phoneNormalized } : null,
    ].filter(Boolean) as any[];

    const nowIso = new Date().toISOString();
    const intentLabel = formatIntentLabel(parsed.data.intent);
    const noteBlock = [
      `[${nowIso}]`,
      `Origem: perfil público da agência ${String(agencyUser.agencyProfile?.name || agencyUser.name || "Agência")}.`,
      `Intenção: ${intentLabel}.`,
      routedMember?.user?.name ? `Roteamento sugerido: ${String(routedMember.user.name)}.` : null,
      parsed.data.message ? `Mensagem: ${String(parsed.data.message).trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const existingClient =
      matchClauses.length > 0
        ? await (prisma as any).client.findFirst({
            where: {
              teamId,
              OR: matchClauses,
            },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              phoneNormalized: true,
              notes: true,
            },
          })
        : null;

    const client = existingClient
      ? await (prisma as any).client.update({
          where: { id: String(existingClient.id) },
          data: {
            email: existingClient.email || email,
            phone: existingClient.phone || phone,
            phoneNormalized: existingClient.phoneNormalized || phoneNormalized,
            notes: appendNotes(existingClient.notes, noteBlock),
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : await (prisma as any).client.create({
          data: {
            teamId,
            createdByUserId: sessionUserId ? String(sessionUserId) : String(agencyUser.id),
            name: parsed.data.name,
            email,
            phone,
            phoneNormalized,
            notes: noteBlock,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        });

    const agencyName = String(agencyUser.agencyProfile?.name || agencyUser.name || "Agência");
    const routedName = routedMember?.user?.name ? String(routedMember.user.name) : null;
    const message = parsed.data.message
      ? `${parsed.data.name} entrou em contato pelo perfil público com intenção de ${intentLabel}. Mensagem: ${parsed.data.message}`
      : `${parsed.data.name} entrou em contato pelo perfil público com intenção de ${intentLabel}.`;

    await RealtorAssistantService.upsertFromRule({
      ownerId: String(agencyUser.id),
      context: "AGENCY",
      teamId,
      clientId: String(client.id),
      type: "AGENCY_PUBLIC_PROFILE_CONTACT",
      priority: parsed.data.intent === "LIST" ? "HIGH" : "MEDIUM",
      title: `${parsed.data.name} pediu ${intentLabel} no perfil público`,
      message: routedName ? `${message} Direcionamento atual: ${routedName}.` : message,
      dueAt: new Date(Date.now() + 30 * 60 * 1000),
      dedupeKey: `agency-public-contact:${teamId}:${client.id}:${parsed.data.intent}`,
      primaryAction: { type: "OPEN_PAGE", url: `/agency/clients?client=${encodeURIComponent(String(client.id))}` },
      secondaryAction: null,
      metadata: {
        source: "AGENCY_PUBLIC_PROFILE",
        agencySlug: String(slug),
        agencyName,
        intent: parsed.data.intent,
        clientId: String(client.id),
        routedRealtorId: routedMember?.userId ? String(routedMember.userId) : null,
        routedRealtorName: routedName,
        contactName: parsed.data.name,
        contactEmail: email,
        contactPhone: phone,
      },
    });

    return NextResponse.json({
      success: true,
      client: {
        id: String(client.id),
        name: String(client.name || ""),
        email: client.email ? String(client.email) : null,
        phone: client.phone ? String(client.phone) : null,
      },
      openWhatsApp: Boolean(routedName),
    });
  } catch (error) {
    console.error("Error creating public agency contact:", error);
    return NextResponse.json({ success: false, error: "Não conseguimos registrar seu contato agora." }, { status: 500 });
  }
}
