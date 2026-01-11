import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, getRealtorRatingRequestEmail } from "@/lib/email";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

function authorizeCron(req: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { ok: true };
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { ok: true };
}

function getSiteUrl() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3001";

  return String(base).replace(/\/$/, "");
}

async function sendRatingRequestEmails() {
  const releasedReservations = await LeadDistributionService.releaseExpiredReservations();
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const leads = await (prisma as any).lead.findMany({
    where: {
      userId: { not: null },
      realtorId: { not: null },
      createdAt: { lte: cutoff },
      rating: null,
      ratingRequestEmailSentAt: null,
    },
    select: {
      id: true,
      createdAt: true,
      ratingRequestEmailSentAt: true,
      user: { select: { id: true, name: true, email: true } },
      realtor: { select: { id: true, name: true, publicSlug: true, publicProfileEnabled: true } },
      property: { select: { title: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  let scanned = 0;
  let eligible = 0;
  let sent = 0;
  let failed = 0;
  let skippedMissingEmail = 0;
  let skippedNoProfile = 0;

  const siteUrl = getSiteUrl();

  for (const lead of leads || []) {
    scanned += 1;

    const userEmail = lead?.user?.email ? String(lead.user.email).trim() : "";
    if (!userEmail) {
      skippedMissingEmail += 1;
      continue;
    }

    const publicSlug = lead?.realtor?.publicSlug ? String(lead.realtor.publicSlug).trim() : "";
    const profileEnabled = Boolean(lead?.realtor?.publicProfileEnabled);
    if (!publicSlug || !profileEnabled) {
      skippedNoProfile += 1;
      continue;
    }

    eligible += 1;

    const realtorName = lead?.realtor?.name?.trim() || "o corretor";
    const profileUrl = `${siteUrl}/realtor/${encodeURIComponent(publicSlug)}#avaliacoes`;

    const { subject, html } = getRealtorRatingRequestEmail({
      userName: lead?.user?.name || null,
      realtorName,
      propertyTitle: lead?.property?.title || null,
      profileUrl,
    });

    const ok = await sendEmail({
      to: userEmail,
      subject,
      html,
    });

    if (!ok) {
      failed += 1;
      continue;
    }

    sent += 1;

    await (prisma as any).lead.update({
      where: { id: lead.id },
      data: { ratingRequestEmailSentAt: new Date() },
      select: { id: true },
    });
  }

  return {
    cutoff: cutoff.toISOString(),
    releasedReservations,
    scanned,
    eligible,
    sent,
    failed,
    skippedMissingEmail,
    skippedNoProfile,
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = authorizeCron(req);
    if (!auth.ok) return auth.response;

    const result = await sendRatingRequestEmails();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[CRON] Error sending rating request emails:", error);
    return NextResponse.json({ error: "Erro ao enviar e-mails de avaliação." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = authorizeCron(req);
    if (!auth.ok) return auth.response;

    const mode = (req.nextUrl.searchParams.get("mode") || "run").toLowerCase();
    if (mode === "status") {
      return NextResponse.json({ success: true, ready: true });
    }

    const result = await sendRatingRequestEmails();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[CRON] Error sending rating request emails:", error);
    return NextResponse.json({ error: "Erro ao enviar e-mails de avaliação." }, { status: 500 });
  }
}
