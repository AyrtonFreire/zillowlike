import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { customAlphabet } from "nanoid";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limiter";
import { hashToken } from "@/lib/token-hash";
import { createAuditLog } from "@/lib/audit-log";

const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const nano = customAlphabet(alphabet, 10);

function formatCode(code: string): string {
  const raw = String(code || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  return raw.length <= 5 ? raw : `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export const POST = withRateLimit(async (req: NextRequest) => {
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

    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = 10;
    const rawCodes = Array.from({ length: count }, () => nano());
    const codes = rawCodes.map(formatCode);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || null;

    await (prisma as any).backupRecoveryCode.deleteMany({ where: { userId } });

    await (prisma as any).backupRecoveryCode.createMany({
      data: rawCodes.map((code) => ({
        userId,
        codeHash: hashToken(code, `backup:${userId}`),
        usedAt: null,
        usedByIp: null,
        usedByUserAgent: null,
      })),
    });

    await createAuditLog({
      level: "SUCCESS",
      action: "AUTH_BACKUP_CODES_GENERATED",
      actorId: userId,
      actorEmail: user.email ?? null,
      targetType: "User",
      targetId: userId,
      metadata: { ip, userAgent },
    });

    return NextResponse.json({ success: true, codes });
  } catch (error) {
    console.error("/api/backup-codes/generate error", error);
    return NextResponse.json({ error: "Erro ao gerar códigos" }, { status: 500 });
  }
}, "auth");
