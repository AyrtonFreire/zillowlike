import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSavedSearchFrequency, normalizeSavedSearchParams } from "@/lib/communication-preferences";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
  if (!userId) return NextResponse.json({ items: [] });
  const rows = await (prisma as any).savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const items = (rows as any[]).map((r: any) => {
    const { queryString } = normalizeSavedSearchParams(r.params);
    return {
      id: r.id,
      label: r.label,
      params: queryString,
      frequency: getSavedSearchFrequency(r.frequency, r.params),
      alertsEnabled: typeof r.alertsEnabled === "boolean" ? r.alertsEnabled : true,
      lastAlertSentAt: r.lastAlertSentAt || null,
      createdAt: r.createdAt,
      ts: r.createdAt.getTime(),
    };
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const label = String(body?.label || "Busca").trim() || "Busca";
  const rawParams = String(body?.params || "");
  const { queryString } = normalizeSavedSearchParams(rawParams);
  const frequency = getSavedSearchFrequency(body?.frequency, rawParams);
  const alertsEnabled = typeof body?.alertsEnabled === "boolean" ? body.alertsEnabled : true;
  const savedSearch = await (prisma as any).savedSearch.create({
    data: {
      userId,
      label,
      params: queryString,
      frequency,
      alertsEnabled,
    },
  });
  return NextResponse.json({ ok: true, id: savedSearch.id });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") || "").trim();
  const ts = Number(searchParams.get("ts"));

  if (id) {
    await prisma.savedSearch.deleteMany({ where: { id, userId } });
    return NextResponse.json({ ok: true });
  }

  if (!ts) return NextResponse.json({ error: "id or ts required" }, { status: 400 });
  const targetDate = new Date(ts);
  await prisma.savedSearch.deleteMany({ where: { userId, createdAt: targetDate } });
  return NextResponse.json({ ok: true });
}
