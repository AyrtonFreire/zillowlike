import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

  const ok = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!ok) return NextResponse.json({ error: "Captcha failed" }, { status: 400 });

  const { propertyId, name, email, phone, message, visitDate, visitTime } = parsed.data;
  const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
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

      return NextResponse.json({ ok: true, leadId: lead.id });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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

  // Get property with owner info
  const propertyWithOwner = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
    },
  });

  // Create lead with contact relation
  const lead = await prisma.lead.create({
    data: {
      propertyId,
      contactId: contact.id,
      message,
    },
  });

  // Send email notification to owner (async, don't wait)
  if (propertyWithOwner?.ownerId) {
    (async () => {
      try {
        const owner = await prisma.user.findUnique({
          where: { id: propertyWithOwner.ownerId! },
          select: { email: true, name: true },
        });

        if (owner?.email) {
          const { sendEmail, getLeadNotificationEmail } = await import("@/lib/email");
          const emailData = getLeadNotificationEmail({
            propertyTitle: propertyWithOwner.title,
            userName: name,
            userEmail: email,
            userPhone: phone,
            message: message || "",
            propertyUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://zillowlike.vercel.app'}/property/${propertyId}`,
          });
          
          await sendEmail({
            to: owner.email,
            ...emailData,
          });
          
          console.log("✅ Lead notification email sent to:", owner.email);
        }
      } catch (err) {
        console.error("❌ Error sending lead email:", err);
      }
    })();
  }

  return NextResponse.json({ ok: true, leadId: lead.id });
}
