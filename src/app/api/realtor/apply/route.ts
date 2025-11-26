import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_ACTIONS, createAuditLog } from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    // Check if user already has an application
    const existingApplication = await prisma.realtorApplication.findUnique({
      where: { userId },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: "Você já possui uma aplicação em andamento" },
        { status: 400 }
      );
    }

    const data = await req.json();

    // Create application
    const application = await prisma.realtorApplication.create({
      data: {
        userId,
        cpf: data.cpf,
        creci: data.creci,
        creciState: data.creciState,
        creciExpiry: new Date(data.creciExpiry),
        phone: data.phone,
        realtorType: data.realtorType,
        experience: data.experience,
        specialties: data.specialties,
        bio: data.bio || null,
        creciDocumentUrl: data.creciDocumentUrl,
        identityDocumentUrl: data.identityDocumentUrl,
        status: "PENDING",
      },
    });

    try {
      await createAuditLog({
        level: "INFO",
        action: AUDIT_LOG_ACTIONS.REALTOR_APPLICATION_SUBMITTED,
        message: "Usuário enviou aplicação para se tornar corretor",
        actorId: application.userId,
        actorEmail: (session.user as any).email || null,
        actorRole: (session.user as any).role || null,
        targetType: "REALTOR_APPLICATION",
        targetId: application.id,
        metadata: {
          cpf: application.cpf,
          creci: application.creci,
          creciState: application.creciState,
          realtorType: application.realtorType,
        },
      });
    } catch {}

    // Notify admin about new application (fire-and-forget)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      (async () => {
        try {
          const { sendEmail, getNewRealtorApplicationAdminEmail } = await import("@/lib/email");
          const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://zillowlike.vercel.app"}/admin/realtor-applications`;
          const emailData = getNewRealtorApplicationAdminEmail({
            applicantName: (session.user as any).name,
            applicantEmail: (session.user as any).email,
            adminUrl,
          });
          await sendEmail({
            to: adminEmail,
            ...emailData,
          });
          console.log("✅ Admin notified about new realtor application:", adminEmail);
        } catch (err) {
          console.error("❌ Error sending admin realtor application email:", err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      application,
    });
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Erro ao criar aplicação" },
      { status: 500 }
    );
  }
}
