import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 403 }
      );
    }

    const { applicationId, reason } = await req.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Motivo da rejeição é obrigatório" },
        { status: 400 }
      );
    }

    // Get application
    const application = await prisma.realtorApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Aplicação não encontrada" },
        { status: 404 }
      );
    }

    if (application.status !== "PENDING") {
      return NextResponse.json(
        { error: "Aplicação já foi processada" },
        { status: 400 }
      );
    }

    // Update application status
    await prisma.realtorApplication.update({
      where: { id: applicationId },
      data: {
        status: "REJECTED",
        reviewedBy: (session.user as any).id,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // TODO: Send rejection email
    console.log(`❌ Aplicação rejeitada: ${application.user.email}`);

    return NextResponse.json({
      success: true,
      message: "Aplicação rejeitada",
    });
  } catch (error) {
    console.error("Error rejecting application:", error);
    return NextResponse.json(
      { error: "Erro ao rejeitar aplicação" },
      { status: 500 }
    );
  }
}
