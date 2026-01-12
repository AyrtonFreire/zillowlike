import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

const Schema = z.object({
  reportId: z.string().min(1),
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const role = (session.user as any).role;
    const adminId = (session.user as any).id as string | undefined;

    if (role !== "ADMIN" || !adminId) {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(String(adminId));
    if (recoveryRes) return recoveryRes;

    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { reportId, status } = parsed.data;

    const report = await (prisma as any).reviewReport.update({
      where: { id: reportId },
      data: {
        status,
        handledByAdminId: adminId,
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Error updating review report:", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar denúncia" }, { status: 500 });
  }
}
