import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteBaseUrl, shouldRunForFrequency } from "@/lib/communication-preferences";
import { getPropertyAlertMatches } from "@/lib/property-alerts";
import { getPropertyAlertEmail, sendEmail } from "@/lib/email";
import { buildPropertyPath } from "@/lib/slug";

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

function formatPrice(price: bigint | number) {
  const cents = typeof price === "bigint" ? Number(price) : price;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

async function runPropertyAlertCron() {
  const baseUrl = getSiteBaseUrl();
  const searches = await (prisma as any).savedSearch.findMany({
    where: { alertsEnabled: true },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      userId: true,
      label: true,
      params: true,
      frequency: true,
      lastAlertSentAt: true,
      lastAlertCursorAt: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  let scanned = 0;
  let eligible = 0;
  let sent = 0;
  let skippedNoEmail = 0;
  let skippedPaused = 0;
  let skippedNotDue = 0;
  let withoutMatches = 0;

  for (const search of searches as any[]) {
    scanned += 1;

    const email = search?.user?.email ? String(search.user.email).trim() : "";
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }

    const subscription = await (prisma as any).emailSubscription.findFirst({
      where: {
        OR: [{ userId: search.userId }, { normalizedEmail: email.toLowerCase() }],
      },
      orderBy: [{ userId: "desc" }, { updatedAt: "desc" }],
    });

    if (subscription && (subscription.status !== "ACTIVE" || !subscription.subscribedToAlerts)) {
      skippedPaused += 1;
      continue;
    }

    if (!shouldRunForFrequency(search.frequency || "DAILY", search.lastAlertSentAt)) {
      skippedNotDue += 1;
      continue;
    }

    eligible += 1;

    const cursor = search.lastAlertCursorAt || search.createdAt;
    const { properties } = await getPropertyAlertMatches(search.params, cursor, 6);

    if (!properties.length) {
      withoutMatches += 1;
      continue;
    }

    const matches = properties.map((property) => ({
      title: property.title,
      location: [property.neighborhood, `${property.city}/${property.state}`].filter(Boolean).join(" • "),
      priceLabel: formatPrice(property.price as any),
      propertyUrl: `${baseUrl}${buildPropertyPath(property.id, property.title)}`,
    }));

    const { subject, html } = getPropertyAlertEmail({
      name: search?.user?.name || null,
      searchLabel: search.label,
      frequency: search.frequency || "DAILY",
      searchUrl: `${baseUrl}/?${String(search.params || "")}`,
      preferencesUrl: `${baseUrl}/account/communication`,
      matches,
    });

    const ok = await sendEmail({ to: email, subject, html });
    if (!ok) {
      continue;
    }

    sent += 1;
    const newestCreatedAt = properties.reduce((latest, property) => {
      if (!latest) return property.createdAt;
      return property.createdAt > latest ? property.createdAt : latest;
    }, null as Date | null);

    await (prisma as any).savedSearch.update({
      where: { id: search.id },
      data: {
        lastAlertSentAt: new Date(),
        lastAlertCursorAt: newestCreatedAt || new Date(),
      },
    });
  }

  return {
    scanned,
    eligible,
    sent,
    skippedNoEmail,
    skippedPaused,
    skippedNotDue,
    withoutMatches,
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = authorizeCron(req);
    if (!auth.ok) return auth.response;

    const result = await runPropertyAlertCron();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[CRON] Error sending property alerts:", error);
    return NextResponse.json({ error: "Erro ao enviar alertas de imóveis." }, { status: 500 });
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

    const result = await runPropertyAlertCron();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[CRON] Error sending property alerts:", error);
    return NextResponse.json({ error: "Erro ao enviar alertas de imóveis." }, { status: 500 });
  }
}
