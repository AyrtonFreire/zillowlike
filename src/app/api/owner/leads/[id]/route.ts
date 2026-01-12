import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId || (role !== "OWNER" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Você não tem permissão para ver este lead." }, { status: 403 });
    }

    const { id } = await context.params;

    const recoveryRes = await requireRecoveryFactor(String(userId));
    if (recoveryRes) return recoveryRes;

    const lead = await (prisma as any).lead.findFirst({
      where: {
        id,
        property: {
          ownerId: String(userId),
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("Error fetching owner lead by id:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar este lead agora." },
      { status: 500 }
    );
  }
}
