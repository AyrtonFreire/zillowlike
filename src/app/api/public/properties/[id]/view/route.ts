import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getIp(req: NextRequest) {
  const xfwd = req.headers.get("x-forwarded-for");
  if (xfwd) return xfwd.split(",")[0].trim();
  // @ts-ignore runtime may expose ip
  return (req as any).ip || null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ ok: false }, { status: 400 });

    const ipAddress = getIp(req);

    let userId: string | null = null;
    try {
      const session: any = await getServerSession(authOptions).catch(() => null);
      userId = (session?.userId || session?.user?.id || null) as string | null;
    } catch {
      userId = null;
    }

    if (userId) {
      const owner = await prisma.property.findUnique({
        where: { id },
        select: { ownerId: true },
      });

      if (owner?.ownerId && String(owner.ownerId) === String(userId)) {
        return NextResponse.json({ ok: true, skipped: "owner" });
      }
    }

    const now = new Date();
    const dedupeSince = new Date(now.getTime() - 30 * 60 * 1000);

    if (ipAddress) {
      const existing = await prisma.propertyView.findFirst({
        where: {
          propertyId: id,
          ipAddress,
          viewedAt: { gte: dedupeSince },
        },
        select: { id: true },
      });

      if (existing?.id) {
        return NextResponse.json({ ok: true, deduped: true });
      }
    } else if (userId) {
      const existing = await prisma.propertyView.findFirst({
        where: {
          propertyId: id,
          userId,
          viewedAt: { gte: dedupeSince },
        },
        select: { id: true },
      });

      if (existing?.id) {
        return NextResponse.json({ ok: true, deduped: true });
      }
    }

    await prisma.propertyView.create({
      data: {
        propertyId: id,
        ipAddress: ipAddress || null,
        userId,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
