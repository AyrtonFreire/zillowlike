import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";
import { hashSessionKey, requireRecentReauth, revokeSessionRecord } from "@/lib/account-security";

export async function DELETE(req: NextRequest, context: { params: { sessionHash: string } }) {
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

    const targetSessionHash = String(context?.params?.sessionHash || "").trim();
    if (!targetSessionHash) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 400 });
    }

    if (targetSessionHash === hashSessionKey(sessionKey)) {
      return NextResponse.json({ error: "Use sair da conta para encerrar a sessão atual." }, { status: 400 });
    }

    const reauthError = requireRecentReauth(req, session, "Confirme sua identidade antes de encerrar uma sessão específica.");
    if (reauthError) {
      return reauthError;
    }

    await revokeSessionRecord(userId, targetSessionHash);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    await createAuditLog({
      level: "WARN",
      action: "AUTH_SESSION_REVOKED",
      actorId: userId,
      actorEmail: user?.email ?? null,
      targetType: "User",
      targetId: userId,
      metadata: {
        revokedSessionHash: targetSessionHash,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/account/security/sessions/[sessionHash] error", error);
    return NextResponse.json({ error: "Erro ao encerrar a sessão." }, { status: 500 });
  }
}
