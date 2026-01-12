import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_ACTIONS, createAuditLog } from "@/lib/audit-log";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.user && !session?.userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const role = session.role || session.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(String(session.userId || session.user?.id || ""));
    if (recoveryRes) return recoveryRes;

    const settings = await (prisma as any).systemSetting.findMany({
      orderBy: { key: "asc" },
      select: {
        key: true,
        value: true,
        description: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Error fetching admin system settings:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar configurações" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.user && !session?.userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const role = session.role || session.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(String(session.userId || session.user?.id || ""));
    if (recoveryRes) return recoveryRes;

    const body = await req.json().catch(() => null);
    const key = typeof body?.key === "string" ? body.key.trim() : "";
    const rawValue = body?.value;

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Chave de configuração inválida." },
        { status: 400 },
      );
    }

    const stringValue = String(rawValue ?? "");

    const prismaAny = prisma as any;
    const existing = await prismaAny.systemSetting.findUnique({
      where: { key },
      select: {
        value: true,
      },
    });

    const updated = await prismaAny.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: stringValue,
        updatedByUserId: session.userId || session.user?.id || null,
      },
      update: {
        value: stringValue,
        updatedByUserId: session.userId || session.user?.id || null,
      },
      select: {
        key: true,
        value: true,
        description: true,
        updatedAt: true,
      },
    });
    try {
      await createAuditLog({
        level: "INFO",
        action: AUDIT_LOG_ACTIONS.ADMIN_SETTING_UPDATE,
        message: "Admin atualizou configuração global",
        actorId: session.userId || session.user?.id || null,
        actorEmail: session.user?.email || null,
        actorRole: role,
        targetType: "SETTING",
        targetId: key,
        metadata: {
          fromValue: existing?.value ?? null,
          toValue: stringValue,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, setting: updated });
  } catch (error) {
    console.error("Error updating admin system setting:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao salvar configuração" },
      { status: 500 },
    );
  }
}
