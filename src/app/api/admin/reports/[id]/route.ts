import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UpdateReportSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).nullable().optional(),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const role = (session.user as any).role;
    const adminId = (session.user as any).id as string | undefined;

    if (role !== "ADMIN" || !adminId) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, severity } = parsed.data;
    const { id } = await context.params;

    const data: any = {
      handledByAdminId: adminId,
    };
    if (status) data.status = status;
    if (typeof severity !== "undefined") data.severity = severity;

    const report = await (prisma as any).report.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar denúncia" },
      { status: 500 }
    );
  }
}
