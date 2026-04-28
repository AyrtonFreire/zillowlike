import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { requireRecentReauth, revokeOtherSessionRecords } from "@/lib/account-security";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String((session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub || "").trim();
    const sessionKey = String((session as any)?.sessionKey || (session as any)?.user?.sessionKey || "").trim();
    if (!userId || !sessionKey) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const reauthError = requireRecentReauth(req, session, "Confirme sua identidade antes de encerrar outras sessões.");
    if (reauthError) {
      return reauthError;
    }

    await revokeOtherSessionRecords(userId, sessionKey);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    await createAuditLog({
      level: "WARN",
      action: "AUTH_SESSIONS_REVOKED_OTHERS",
      actorId: userId,
      actorEmail: user?.email ?? null,
      targetType: "User",
      targetId: userId,
      metadata: {
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/account/security/sessions error", error);
    return NextResponse.json({ error: "Erro ao encerrar outras sessões." }, { status: 500 });
  }
}
