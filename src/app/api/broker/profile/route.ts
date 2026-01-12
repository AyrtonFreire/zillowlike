import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

// GET - Buscar perfil do corretor
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        role: true,
        publicSlug: true,
        publicHeadline: true,
        publicBio: true,
        publicCity: true,
        publicState: true,
        publicPhoneOptIn: true,
        publicInstagram: true,
        publicLinkedIn: true,
        publicWhatsApp: true,
        publicFacebook: true,
        publicServiceAreas: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Apenas REALTOR ou AGENCY podem acessar
    if (user.role !== "REALTOR" && user.role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT - Atualizar perfil do corretor
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Apenas REALTOR ou AGENCY podem editar
    if (user.role !== "REALTOR" && user.role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(String(user.id));
    if (recoveryRes) return recoveryRes;

    const body = await req.json();

    // Validar slug único
    if (body.publicSlug) {
      const existingSlug = await prisma.user.findFirst({
        where: {
          publicSlug: body.publicSlug,
          id: { not: user.id },
        },
      });

      if (existingSlug) {
        return NextResponse.json(
          { error: "Este slug já está em uso. Escolha outro." },
          { status: 400 }
        );
      }
    }

    // Atualizar perfil (sempre mantendo perfil público ativo para corretores)
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        publicSlug: body.publicSlug?.toLowerCase().replace(/[^a-z0-9-]/g, "") || null,
        publicProfileEnabled: true,
        publicHeadline: body.publicHeadline?.slice(0, 200) || null,
        publicBio: body.publicBio?.slice(0, 500) || null,
        publicCity: body.publicCity || null,
        publicState: body.publicState?.toUpperCase().slice(0, 2) || null,
        publicPhoneOptIn: Boolean(body.publicPhoneOptIn),
        publicInstagram: body.publicInstagram?.replace("@", "") || null,
        publicLinkedIn: body.publicLinkedIn || null,
        publicWhatsApp: body.publicWhatsApp?.replace(/\D/g, "") || null,
        publicFacebook: body.publicFacebook || null,
        publicServiceAreas: Array.isArray(body.publicServiceAreas) 
          ? body.publicServiceAreas.filter((a: string) => a.trim()).slice(0, 20)
          : [],
      },
      select: {
        publicSlug: true,
        publicProfileEnabled: true,
        publicHeadline: true,
        publicBio: true,
        publicCity: true,
        publicState: true,
        publicPhoneOptIn: true,
        publicInstagram: true,
        publicLinkedIn: true,
        publicWhatsApp: true,
        publicFacebook: true,
        publicServiceAreas: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
