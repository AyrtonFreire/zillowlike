import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const becomeAgencySchema = z.object({
  name: z.string().trim().min(2).max(120),
  cnpj: z.string().trim().min(1),
  phone: z.string().trim().min(6).max(40).optional(),
});

function normalizeCnpj(input: string) {
  return String(input || "").replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const currentRole = ((session.user as any).role as string | undefined) || "USER";

    if (currentRole === "ADMIN") {
      return NextResponse.json(
        { error: "Admins não podem virar agência por este endpoint" },
        { status: 403 }
      );
    }

    const existingAgency = await (prisma as any).agencyProfile.findUnique({
      where: { userId },
      select: { id: true, teamId: true },
    });

    if (existingAgency) {
      return NextResponse.json({
        success: true,
        alreadyAgency: true,
        teamId: existingAgency.teamId,
      });
    }

    const membershipCount = await (prisma as any).teamMember.count({
      where: { userId },
    });

    if (membershipCount > 0) {
      return NextResponse.json(
        {
          error:
            "Você já faz parte de um time. Para virar agência, primeiro saia do time atual.",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = becomeAgencySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const name = parsed.data.name.trim();
    const cnpj = normalizeCnpj(parsed.data.cnpj);
    const phone = parsed.data.phone?.trim() || null;

    if (cnpj.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ inválido. Informe um CNPJ com 14 dígitos." },
        { status: 400 }
      );
    }

    const cnpjConflict = await (prisma as any).agencyProfile.findUnique({
      where: { cnpj },
      select: { id: true },
    });

    if (cnpjConflict) {
      return NextResponse.json(
        { error: "Este CNPJ já está cadastrado." },
        { status: 400 }
      );
    }

    const result = await (prisma as any).$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          role: "AGENCY",
          realtorCreci: null,
          realtorCreciState: null,
          realtorType: null,
        },
        select: { id: true },
      });

      const team = await tx.team.create({
        data: {
          name,
          ownerId: userId,
          members: {
            create: {
              userId,
              role: "OWNER",
            },
          },
        },
        select: { id: true },
      });

      const agencyProfile = await tx.agencyProfile.create({
        data: {
          name,
          cnpj,
          phone,
          userId,
          teamId: team.id,
        },
        select: { id: true },
      });

      return { teamId: team.id, agencyProfileId: agencyProfile.id };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error becoming agency:", error);
    return NextResponse.json(
      { error: "Erro ao registrar agência" },
      { status: 500 }
    );
  }
}
