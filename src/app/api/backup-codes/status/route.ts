import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId =
      (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const total = await (prisma as any).backupRecoveryCode.count({ where: { userId } });
    const unused = await (prisma as any).backupRecoveryCode.count({
      where: { userId, usedAt: null },
    });

    return NextResponse.json({
      success: true,
      total,
      unused,
    });
  } catch (error) {
    console.error("/api/backup-codes/status error", error);
    return NextResponse.json({ error: "Erro ao buscar status" }, { status: 500 });
  }
}
