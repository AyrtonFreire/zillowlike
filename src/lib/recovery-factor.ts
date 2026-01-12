import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function requireRecoveryFactor(userId: string, message?: string) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await (prisma as any).user.findUnique({
    where: { id: safeUserId },
    select: {
      phone: true,
      phoneVerifiedAt: true,
      emailVerified: true,
      recoveryEmailVerifiedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasVerifiedPhone = !!(user.phone && String(user.phone).trim() && user.phoneVerifiedAt);
  const hasVerifiedEmail = !!user.emailVerified;
  const hasVerifiedRecoveryEmail = !!user.recoveryEmailVerifiedAt;

  let hasBackupCodes = false;
  try {
    const backupCodesUnused = await (prisma as any).backupRecoveryCode.count({
      where: { userId: safeUserId, usedAt: null },
    });
    hasBackupCodes = (Number(backupCodesUnused) || 0) > 0;
  } catch {
    hasBackupCodes = false;
  }

  if (!hasVerifiedPhone && !hasVerifiedEmail && !hasVerifiedRecoveryEmail && !hasBackupCodes) {
    return NextResponse.json(
      {
        error:
          message ||
          "Para continuar, configure pelo menos um método de recuperação (telefone verificado, e-mail verificado, e-mail de recuperação verificado ou backup codes) em Meu Perfil.",
      },
      { status: 400 }
    );
  }

  return null;
}
