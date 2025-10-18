import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const rateMap = new Map<string, number[]>();
function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  // @ts-ignore
  return (req as any).ip || "unknown";
}
function checkRateLimit(req: NextRequest): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 20;
  const arr = rateMap.get(ip) || [];
  const recent = arr.filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateMap.set(ip, recent);
  return true;
}
// GET: return list of propertyIds favorited by current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ items: [] });
  const userId = (session as any).user?.id || (session as any).userId || (session as any).user?.sub;
  if (!userId) return NextResponse.json({ items: [] });
  const search = new URL(req.url).searchParams;
  const filter = (search.get('filter') || 'visible').toLowerCase();
  const where: any = { userId };
  if (filter === 'hidden') where.hidden = true; else if (filter === 'visible') where.hidden = false;
  const favs = await prisma.favorite.findMany({ where, select: { propertyId: true } });
  return NextResponse.json({ items: favs.map((f: { propertyId: string }) => f.propertyId) });
}

// POST: toggle favorite { propertyId }
export async function POST(req: NextRequest) {
  if (!checkRateLimit(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session as any).user?.id || (session as any).userId || (session as any).user?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const propertyId = body?.propertyId as string;
  const action = (body?.action as string | undefined)?.toLowerCase();
  if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });

  const existing = await prisma.favorite.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
  });
  // Actions: remove | hide | show | toggle (default)
  if (action === 'remove') {
    if (existing) await prisma.favorite.delete({ where: { userId_propertyId: { userId, propertyId } } });
    return NextResponse.json({ status: 'removed' });
  }
  if (action === 'hide') {
    if (existing) await prisma.favorite.update({ where: { userId_propertyId: { userId, propertyId } }, data: { hidden: true } });
    else await prisma.favorite.create({ data: { userId, propertyId, hidden: true } });
    return NextResponse.json({ status: 'hidden' });
  }
  if (action === 'show') {
    if (existing) await prisma.favorite.update({ where: { userId_propertyId: { userId, propertyId } }, data: { hidden: false } });
    else await prisma.favorite.create({ data: { userId, propertyId, hidden: false } });
    return NextResponse.json({ status: 'visible' });
  }
  // toggle favorite
  if (existing) {
    await prisma.favorite.delete({ where: { userId_propertyId: { userId, propertyId } } });
    return NextResponse.json({ status: 'removed' });
  } else {
    await prisma.favorite.create({ data: { userId, propertyId, hidden: false } });
    return NextResponse.json({ status: 'added' });
  }
}
