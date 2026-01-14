import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const rateMap = new Map<string, { ts: number[] }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

function getIp(req: NextRequest) {
  const xfwd = req.headers.get("x-forwarded-for");
  if (xfwd) return xfwd.split(",")[0].trim();
  // @ts-ignore runtime may expose ip
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

function normalizePhoneDigits(raw: string) {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return "";
  // If already includes country code (Brazil)
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

async function getWhatsAppPayload(req: NextRequest, id: string) {
  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      hideOwnerContact: true,
      title: true,
      teamId: true,
      owner: {
        select: {
          id: true,
          role: true,
          phone: true,
          phoneVerifiedAt: true,
          publicPhoneOptIn: true,
        } as any,
      },
    },
  });

  if (!property) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const status = (property as any)?.status;
  const isActiveLike = status === "ACTIVE" || status === null || status === "" || typeof status === "undefined";
  if (!isActiveLike) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const owner = (property as any)?.owner as any;
  if (!owner) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const ownerRole = String(owner?.role || "").toUpperCase();
  const isRealtorOrAgency = ownerRole === "REALTOR" || ownerRole === "AGENCY";

  // If advertiser opted to hide contact, do not expose (only for direct owners)
  if ((property as any)?.hideOwnerContact && !isRealtorOrAgency) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  // For realtor/agency, respect profile opt-in to publish phone/WhatsApp
  if (isRealtorOrAgency && !owner?.publicPhoneOptIn) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const hasVerifiedPhone = !!(owner.phone && owner.phoneVerifiedAt);
  if (!hasVerifiedPhone) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const phoneDigits = normalizePhoneDigits(owner.phone);
  if (!phoneDigits) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const origin = req.nextUrl.origin;
  const propertyUrl = `${origin}/property/${property.id}`;
  const text = encodeURIComponent(`Olá! Tenho interesse no imóvel: ${propertyUrl}`);
  const whatsappUrl = `https://wa.me/${phoneDigits}?text=${text}`;

  return {
    ok: true as const,
    whatsappUrl,
    propertyId: String(property.id),
    propertyTitle: property.title ? String(property.title) : "Imóvel",
    propertyUrl,
    teamId: (property as any)?.teamId ? String((property as any).teamId) : null,
    ownerId: owner?.id ? String(owner.id) : null,
    ownerRole,
    isRealtorOrAgency,
  };
}

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;

    const payload = await getWhatsAppPayload(req, String(id));
    if (!payload.ok) return payload.response;

    const res = NextResponse.json({ whatsappUrl: payload.whatsappUrl });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.error("/api/properties/[id]/whatsapp GET error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const ip = getIp(req);
    if (!checkRate(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const payload = await getWhatsAppPayload(req, String(id));
    if (!payload.ok) return payload.response;

    const session: any = await getServerSession(authOptions).catch(() => null);
    const sessionUserId = session?.userId || session?.user?.id || session?.user?.sub || null;

    // Only realtor/agency listings can generate assistant items.
    if (payload.isRealtorOrAgency && payload.ownerId) {
      const now = new Date();
      const recentThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const existingLead: any = await (prisma as any).lead.findFirst({
        where: {
          propertyId: payload.propertyId,
          realtorId: payload.ownerId,
          isDirect: true,
          ...(sessionUserId
            ? {
                OR: [{ userId: String(sessionUserId) }, { userId: null, contactId: null }],
              }
            : { userId: null, contactId: null }),
          updatedAt: { gte: recentThreshold },
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      const lead = existingLead?.id
        ? await (prisma as any).lead.update({
            where: { id: String(existingLead.id) },
            data: {
              updatedAt: now,
              ...(sessionUserId ? { userId: String(sessionUserId) } : {}),
            },
            select: { id: true },
          })
        : await (prisma as any).lead.create({
            data: {
              propertyId: payload.propertyId,
              realtorId: payload.ownerId,
              teamId: payload.teamId ?? undefined,
              ...(sessionUserId ? { userId: String(sessionUserId) } : {}),
              status: "ACCEPTED",
              pipelineStage: "NEW",
              isDirect: true,
              message: "Interesse via WhatsApp",
            },
            select: { id: true },
          });

      if (!existingLead?.id) {
        await LeadEventService.record({
          leadId: String(lead.id),
          type: "LEAD_CREATED",
          title: "Lead criado por clique no WhatsApp",
          metadata: {
            source: "WHATSAPP",
            kind: "CLICK",
            propertyId: payload.propertyId,
            ip,
          },
        });
      }

      const assistantItem = await RealtorAssistantService.upsertFromRule({
        context: "REALTOR",
        ownerId: payload.ownerId,
        leadId: String(lead.id),
        type: "LEAD_NO_FIRST_CONTACT",
        priority: "HIGH",
        title: "Novo interesse via WhatsApp",
        message: `Alguém clicou no WhatsApp do imóvel “${payload.propertyTitle}”. Gere a primeira mensagem e confirme o contato.`,
        dueAt: now,
        dedupeKey: `WHATSAPP_CLICK:${payload.propertyId}`,
        primaryAction: { type: "OPEN_LEAD", leadId: String(lead.id) },
        secondaryAction: null,
        metadata: {
          source: "WHATSAPP",
          kind: "CLICK",
          propertyId: payload.propertyId,
          propertyUrl: payload.propertyUrl,
          whatsappUrl: payload.whatsappUrl,
        },
      });

      try {
        await RealtorAssistantService.emitItemUpdated(payload.ownerId, assistantItem);
      } catch {
      }
    }

    const res = NextResponse.json({ whatsappUrl: payload.whatsappUrl });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.error("/api/properties/[id]/whatsapp POST error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
