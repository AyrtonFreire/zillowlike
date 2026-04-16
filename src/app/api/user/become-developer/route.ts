import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const becomeDeveloperSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  brandName: z.string().trim().max(160).optional(),
  cnpj: z.string().trim().min(1),
  phone: z.string().trim().min(6).max(40).optional(),
  website: z.string().trim().url().max(240).optional().or(z.literal("")),
  businessType: z.enum(["CONSTRUTORA", "INCORPORADORA", "LOTEADORA", "URBANIZADORA", "MISTA"]),
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
        { error: "Admins não podem virar incorporadora por este endpoint" },
        { status: 403 }
      );
    }

    const existingDeveloper = await (prisma as any).developerProfile.findUnique({
      where: { userId },
      select: { id: true, teamId: true },
    });

    if (existingDeveloper) {
      return NextResponse.json({
        success: true,
        alreadyDeveloper: true,
        teamId: existingDeveloper.teamId,
      });
    }

    const membershipCount = await (prisma as any).teamMember.count({
      where: { userId },
    });

    if (membershipCount > 0) {
      return NextResponse.json(
        {
          error:
            "Você já faz parte de um time. Para virar incorporadora, primeiro saia do time atual.",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = becomeDeveloperSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const legalName = parsed.data.legalName.trim();
    const brandName = parsed.data.brandName?.trim() || null;
    const cnpj = normalizeCnpj(parsed.data.cnpj);
    const phone = parsed.data.phone?.trim() || null;
    const website = parsed.data.website?.trim() || null;
    const businessType = parsed.data.businessType;
    const workspaceName = brandName || legalName;

    if (cnpj.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ inválido. Informe um CNPJ com 14 dígitos." },
        { status: 400 }
      );
    }

    const cnpjConflict = await (prisma as any).developerProfile.findUnique({
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
          role: "DEVELOPER",
          realtorCreci: null,
          realtorCreciState: null,
          realtorType: null,
        },
        select: { id: true },
      });

      const team = await tx.team.create({
        data: {
          name: workspaceName,
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

      const developerProfile = await tx.developerProfile.create({
        data: {
          legalName,
          brandName,
          cnpj,
          phone,
          website,
          businessType,
          userId,
          teamId: team.id,
        },
        select: { id: true },
      });

      return { teamId: team.id, developerProfileId: developerProfile.id };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error becoming developer:", error);
    return NextResponse.json(
      { error: "Erro ao registrar incorporadora" },
      { status: 500 }
    );
  }
}
