import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession();
  const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
  if (!userId) return NextResponse.json({ items: [] });
  const rows = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const items = rows.map(r => ({ label: r.label, params: r.params, ts: r.createdAt.getTime() }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const label = String(body?.label || "Busca");
  const params = String(body?.params || "");
  await prisma.savedSearch.create({ data: { userId, label, params } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const ts = Number(searchParams.get("ts"));
  if (!ts) return NextResponse.json({ error: "ts required" }, { status: 400 });
  const targetDate = new Date(ts);
  await prisma.savedSearch.deleteMany({ where: { userId, createdAt: targetDate } });
  return NextResponse.json({ ok: true });
}
