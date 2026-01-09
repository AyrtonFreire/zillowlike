import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateAgencyProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(6).max(40).nullable().optional(),
});

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null, role: null };
  }

  const userId = session.userId || session.user?.id || null;
  const role = session.role || session.user?.role || null;

  return { userId, role };
}

export async function GET() {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const agencyProfile = await (prisma as any).agencyProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        phone: true,
        cnpj: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!agencyProfile) {
      return NextResponse.json({ error: "Perfil de agência não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, agencyProfile });
  } catch (error) {
    console.error("Error fetching agency profile:", error);
    return NextResponse.json({ error: "Não conseguimos carregar o perfil da agência." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "AGENCY" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = updateAgencyProfileSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const existing = await (prisma as any).agencyProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        teamId: true,
        name: true,
        phone: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Perfil de agência não encontrado" }, { status: 404 });
    }

    const updateData: any = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;

    const nameChanged = typeof updateData.name === "string" && updateData.name.trim() && updateData.name !== existing.name;

    const result = await (prisma as any).$transaction(async (tx: any) => {
      const updated = await tx.agencyProfile.update({
        where: { id: existing.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          phone: true,
          cnpj: true,
          teamId: true,
        },
      });

      if (nameChanged) {
        await tx.team.update({
          where: { id: existing.teamId },
          data: { name: String(updateData.name) },
          select: { id: true },
        });
      }

      return updated;
    });

    return NextResponse.json({ success: true, agencyProfile: result });
  } catch (error) {
    console.error("Error updating agency profile:", error);
    return NextResponse.json({ error: "Não conseguimos salvar o perfil da agência." }, { status: 500 });
  }
}
