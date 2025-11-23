import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateReportSchema = z.object({
  targetType: z.enum(["PROPERTY", "USER", "LEAD", "BUG", "OTHER"]),
  targetId: z.string().optional(),
  reason: z.enum([
    "FAKE_LISTING",
    "INAPPROPRIATE_PHOTO",
    "SCAM",
    "BAD_BEHAVIOR",
    "BUG",
    "OTHER",
  ]),
  description: z.string().min(10).max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Usuário inválido" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { targetType, targetId, reason, description } = parsed.data;

    // Monta os campos de destino de forma segura
    let propertyId: string | undefined;
    let targetUserId: string | undefined;
    let leadId: string | undefined;

    if (targetType === "PROPERTY") {
      propertyId = targetId;
    } else if (targetType === "USER") {
      targetUserId = targetId;
    } else if (targetType === "LEAD") {
      leadId = targetId;
    }

    const report = await (prisma as any).report.create({
      data: {
        targetType,
        reason,
        description,
        reportedByUserId: userId,
        propertyId,
        targetUserId,
        leadId,
      },
    });

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao registrar denúncia" },
      { status: 500 }
    );
  }
}
