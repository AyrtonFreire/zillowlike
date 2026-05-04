import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RECENT_REAUTH_COOKIE_NAME,
  hashSessionKey,
  listKnownSessionRecords,
  verifyRecentReauthCookieValue,
} from "@/lib/account-security";

const SECURITY_AUDIT_ACTIONS = [
  "AUTH_SESSION_CREATED",
  "AUTH_REAUTH_CONFIRMED",
  "AUTH_BACKUP_CODES_GENERATED",
  "AUTH_EMAIL_CHANGE_CODE_SENT",
  "AUTH_EMAIL_CHANGED",
  "AUTH_PHONE_VERIFIED",
  "AUTH_RECOVERY_EMAIL_CODE_SENT",
  "AUTH_RECOVERY_EMAIL_SET",
  "AUTH_PASSWORD_SET",
  "AUTH_SESSIONS_REVOKED_OTHERS",
  "AUTH_SESSION_REVOKED",
] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String((session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub || "").trim();
    const sessionKey = String((session as any)?.sessionKey || (session as any)?.user?.sessionKey || "").trim();
    if (!userId) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const [user, sessionRecords, auditLogs] = await Promise.all([
      (prisma as any).user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          phone: true,
          phoneVerifiedAt: true,
          recoveryEmail: true,
          recoveryEmailVerifiedAt: true,
          passwordHash: true,
        },
      }),
      listKnownSessionRecords(userId),
      (prisma as any).auditLog.findMany({
        where: {
          OR: [{ actorId: userId }, { targetId: userId }],
          action: { in: [...SECURITY_AUDIT_ACTIONS] },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          level: true,
          message: true,
          actorEmail: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const backupCodesUnused = await (prisma as any).backupRecoveryCode.count({
      where: { userId, usedAt: null },
    });

    const sessionContextReady = Boolean(sessionKey);
    const currentSessionHash = sessionContextReady ? hashSessionKey(sessionKey) : null;
    const cookieValue = req.cookies.get(RECENT_REAUTH_COOKIE_NAME)?.value;
    const recentReauth = sessionContextReady ? verifyRecentReauthCookieValue(cookieValue, userId, sessionKey) : false;

    const protectionItems = [
      {
        key: "email",
        label: "E-mail principal verificado",
        ok: Boolean(user.email && user.emailVerified),
      },
      {
        key: "password",
        label: "Senha local configurada",
        ok: Boolean(user.passwordHash),
      },
      {
        key: "phone",
        label: "Telefone verificado",
        ok: Boolean(user.phone && user.phoneVerifiedAt),
      },
      {
        key: "recovery",
        label: "E-mail de recuperação confirmado",
        ok: Boolean(user.recoveryEmail && user.recoveryEmailVerifiedAt),
      },
      {
        key: "backup",
        label: "Códigos de backup disponíveis",
        ok: backupCodesUnused > 0,
      },
      {
        key: "reauth",
        label: "Reautenticação recente disponível",
        ok: recentReauth,
      },
    ];

    const protectionScore = Math.round(
      (protectionItems.filter((item: any) => item.ok).length / protectionItems.length) * 100
    );

    const sessions = sessionRecords
      .map((record) => ({
        id: record.sessionHash,
        provider: record.provider,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        isCurrent: Boolean(currentSessionHash) && record.sessionHash === currentSessionHash,
      }))
      .sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    const recentActivity = auditLogs.map((event: any) => ({
      id: event.id,
      action: event.action,
      level: event.level,
      message: event.message,
      actorEmail: event.actorEmail,
      metadata: event.metadata ?? null,
      createdAt: event.createdAt.toISOString(),
    }));

    const recommendations = protectionItems
      .filter((item: any) => !item.ok)
      .map((item: any) => item.label)
      .slice(0, 4);

    return NextResponse.json({
      success: true,
      overview: {
        protectionScore,
        backupCodesUnused,
        currentSessionHash,
        sessionContextReady,
        recentReauth,
        recommendations: sessionContextReady ? recommendations : ["Renovar login para identificar sua sessão atual", ...recommendations].slice(0, 4),
      },
      protectionItems,
      sessions,
      recentActivity,
    });
  } catch (error) {
    console.error("/api/account/security error", error);
    return NextResponse.json({ error: "Erro ao carregar a central de segurança." }, { status: 500 });
  }
}
