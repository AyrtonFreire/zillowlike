import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
