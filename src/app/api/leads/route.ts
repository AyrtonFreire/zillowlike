import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

// Gera um token único para chat do cliente
function generateChatToken(): string {
  return randomBytes(32).toString("hex");
}

const rateMap = new Map<string, { ts: number[] }>();
const WINDOW_MS = 60_000; // 1 min
const MAX_REQUESTS = 10; // per IP per window

function getIp(req: NextRequest) {
  const xfwd = req.headers.get("x-forwarded-for");
  if (xfwd) return xfwd.split(',')[0].trim();
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

const LeadSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(5).max(2000).optional(),
  visitDate: z.string().optional(), // 🆕 Data da visita (ISO string)
  visitTime: z.string().optional(), // 🆕 Horário (ex: "14:00")
  isDirect: z.boolean().optional(), // 🆕 Se true, contato direto (não vai ao mural)
  turnstileToken: z.string().optional(),
});

async function verifyTurnstile(token?: string, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // bypass in dev if not configured
  if (!token) return false;
  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data: any = await r.json();
    return !!data.success;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  if (!checkRate(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const json = await req.json().catch(() => null);
  const parsed = LeadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const session: any = await getServerSession(authOptions).catch(() => null);
  const sessionUserId = session?.userId || session?.user?.id || null;

  if (!sessionUserId) {
    const ok = await verifyTurnstile(parsed.data.turnstileToken, ip);
    if (!ok) return NextResponse.json({ error: "Captcha failed" }, { status: 400 });
  }

  const { propertyId, name, email, phone, message, visitDate, visitTime, isDirect } = parsed.data;
  const isDirectFlag = isDirect ?? false;

  const prop = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, teamId: true } as any,
  });
  if (!prop) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // 🆕 Se tiver visitDate e visitTime, usar VisitSchedulingService
  if (visitDate && visitTime) {
    const { VisitSchedulingService } = await import("@/lib/visit-scheduling-service");
    
    try {
      const lead = await VisitSchedulingService.createVisitRequest({
        propertyId,
        clientName: name,
        clientEmail: email,
        clientPhone: phone,
        visitDate: new Date(visitDate),
        visitTime,
        clientNotes: message,
      });

      return NextResponse.json({ 
        ok: true, 
        leadId: lead.id, 
        chatToken: lead.clientChatToken,
        chatUrl: lead.chatUrl,
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (sessionUserId) {
    try {
      const existing: any = await (prisma as any).lead.findFirst({
        where: {
          propertyId,
          isDirect: isDirectFlag,
          OR: [
            { userId: String(sessionUserId) },
            { contact: { email } },
          ],
        },
        select: {
          id: true,
          userId: true,
          clientChatToken: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (existing?.id) {
        if (!existing.userId) {
          try {
            await (prisma as any).lead.update({
              where: { id: existing.id },
              data: { userId: String(sessionUserId) },
              select: { id: true },
            });
          } catch {
            // ignore
          }
        }

        let token: string | null = existing.clientChatToken || null;
        if (!token) {
          token = generateChatToken();
          const updated = await (prisma as any).lead.update({
            where: { id: existing.id },
            data: { clientChatToken: token },
            select: { clientChatToken: true },
          });
          token = updated?.clientChatToken || token;
        }

        const chatUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://zillowlike.vercel.app"}/chat/${token}`;
        return NextResponse.json({ ok: true, leadId: existing.id, chatToken: token, chatUrl, reused: true });
      }
    } catch {
      // ignore reuse errors and continue creating new lead
    }
  }

  // Fluxo antigo (sem horário de visita)
  // Create or find contact
  let contact = await prisma.contact.findFirst({
    where: { email },
  });
  
  if (!contact) {
    contact = await prisma.contact.create({
      data: { name, email, phone },
    });
  }

  // Get property with owner info (including owner role)
  const propertyWithOwner = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      owner: { select: { id: true, role: true, email: true, name: true } },
    },
  });

  // Gerar token para chat do cliente
  const clientChatToken = generateChatToken();

  // Determinar se o owner é corretor/imobiliária para atribuir automaticamente como realtor do lead
  const ownerIsRealtor = propertyWithOwner?.owner?.role === "REALTOR" || propertyWithOwner?.owner?.role === "AGENCY";
  const autoRealtorId = ownerIsRealtor ? propertyWithOwner?.owner?.id : undefined;

  console.log("[LEAD] Criando lead:", {
    propertyId,
    ownerId: propertyWithOwner?.ownerId,
    ownerRole: propertyWithOwner?.owner?.role,
    ownerIsRealtor,
    autoRealtorId,
    isDirect,
  });

  // Create lead with contact relation
  const lead = await (prisma as any).lead.create({
    data: {
      propertyId,
      contactId: contact.id,
      userId: sessionUserId ? String(sessionUserId) : undefined,
      message,
      isDirect: isDirectFlag,
      teamId: (prop as any)?.teamId ?? undefined,
      clientChatToken, // Token para o cliente acessar o chat
      // Se o owner é REALTOR/AGENCY, atribuir automaticamente como corretor responsável
      realtorId: autoRealtorId,
      // Se tem realtorId, já marca como ACCEPTED; caso contrário, segue fluxo padrão PENDING
      status: autoRealtorId ? "ACCEPTED" : "PENDING",
    },
  });

  if (message && String(message).trim().length > 0) {
    try {
      await (prisma as any).leadClientMessage.create({
        data: {
          leadId: lead.id,
          fromClient: true,
          content: String(message),
        },
      });
    } catch {
      // ignore
    }
  }

  if (lead.realtorId) {
    const hasInitialMessage = !!(message && String(message).trim().length > 0);
    const shouldRecalc = lead.status === "RESERVED" || hasInitialMessage;
    if (shouldRecalc) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
        // ignore
      }
    }
  }

  await LeadEventService.record({
    leadId: lead.id,
    type: "LEAD_CREATED",
    title: "Lead criado pelo formulário",
    description: message || null,
    metadata: {
      source: "CONTACT_FORM",
      propertyId,
      email,
      isDirect: isDirect ?? false,
    },
  });

  const chatUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://zillowlike.vercel.app'}/chat/${clientChatToken}`;

  // Send emails (async, don't wait)
  (async () => {
    try {
      const { sendEmail, getLeadNotificationEmail, getClientConfirmationEmail } = await import("@/lib/email");
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zillowlike.vercel.app';

      // 1. Email para o proprietário/corretor
      const owner = propertyWithOwner?.owner;
      console.log("[EMAIL] Dados do owner:", {
        ownerId: propertyWithOwner?.ownerId,
        ownerEmail: owner?.email,
        ownerName: owner?.name,
        ownerRole: owner?.role,
      });

      if (owner?.email) {
        const emailData = getLeadNotificationEmail({
          propertyTitle: propertyWithOwner?.title || "Imóvel",
          userName: name,
          userEmail: email,
          userPhone: phone,
          message: message || "",
          propertyUrl: `${siteUrl}/property/${propertyId}`,
        });
        
        console.log("[EMAIL] Enviando notificação para owner:", owner.email);
        const sent = await sendEmail({
          to: owner.email,
          ...emailData,
        });
        
        if (sent) {
          console.log("✅ Lead notification email sent to owner:", owner.email);
        } else {
          console.error("❌ Falha ao enviar email para owner:", owner.email);
        }
      } else {
        console.warn("⚠️ Owner não tem email cadastrado, pulando notificação");
      }

      // 2. Email de confirmação para o cliente com link do chat
      if (email) {
        const clientEmailData = getClientConfirmationEmail({
          clientName: name,
          propertyTitle: propertyWithOwner?.title || "Imóvel",
          chatUrl,
          propertyUrl: `${siteUrl}/property/${propertyId}`,
        });
        
        await sendEmail({
          to: email,
          ...clientEmailData,
        });
        
        console.log("✅ Confirmation email sent to client:", email);
      }
    } catch (err) {
      console.error("❌ Error sending emails:", err);
    }
  })();

  return NextResponse.json({ ok: true, leadId: lead.id, chatToken: clientChatToken, chatUrl });
}
