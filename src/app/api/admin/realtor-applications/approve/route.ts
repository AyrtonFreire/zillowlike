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

    const { applicationId } = await req.json();

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

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx: any) => {
      // 1. Update application status
      await tx.realtorApplication.update({
        where: { id: applicationId },
        data: {
          status: "APPROVED",
          reviewedBy: (session.user as any).id,
          reviewedAt: new Date(),
        },
      });

      // 2. Update user role to REALTOR
      await tx.user.update({
        where: { id: application.userId },
        data: {
          role: "REALTOR",
          phone: application.phone, // Update phone if not set
        },
      });

      // 3. Get next position in queue
      const maxPosition = await tx.realtorQueue.findFirst({
        orderBy: { position: "desc" },
        select: { position: true },
      });

      const nextPosition = (maxPosition?.position || 0) + 1;

      // 4. Add to realtor queue
      await tx.realtorQueue.create({
        data: {
          realtorId: application.userId,
          position: nextPosition,
          score: 0,
          status: "ACTIVE",
          activeLeads: 0,
          bonusLeads: 0,
          totalAccepted: 0,
          totalRejected: 0,
          totalExpired: 0,
        },
      });

      // 5. Create realtor stats
      await tx.realtorStats.create({
        data: {
          realtorId: application.userId,
          totalLeads: 0,
          acceptedLeads: 0,
          rejectedLeads: 0,
          completedLeads: 0,
          cancelledLeads: 0,
          avgResponseTime: 0,
          successRate: 0,
        },
      });
    });

    // Send approval email (fire-and-forget)
    if (application.user.email) {
      (async () => {
        try {
          const { sendEmail, getRealtorApplicationApprovedEmail } = await import("@/lib/email");
          const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://zillowlike.vercel.app"}/broker/dashboard`;
          const emailData = getRealtorApplicationApprovedEmail({
            name: application.user.name || "",
            dashboardUrl,
          });
          await sendEmail({
            to: application.user.email!,
            ...emailData,
          });
          console.log("✅ Realtor approval email sent to:", application.user.email);
        } catch (error) {
          console.error("❌ Error sending realtor approval email:", error);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      message: "Aplicação aprovada e corretor adicionado à fila",
    });
  } catch (error) {
    console.error("Error approving application:", error);
    return NextResponse.json(
      { error: "Erro ao aprovar aplicação" },
      { status: 500 }
    );
  }
}
