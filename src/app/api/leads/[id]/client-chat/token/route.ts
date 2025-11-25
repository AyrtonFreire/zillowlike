import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    const { id } = await context.params;

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        realtorId: true,
        clientChatToken: true,
        property: {
          select: {
            ownerId: true,
          },
        },
        team: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const isRealtor = lead.realtorId && lead.realtorId === userId;
    const isPropertyOwner = lead.property?.ownerId && lead.property.ownerId === userId;
    const isTeamOwner = lead.team?.ownerId && lead.team.ownerId === userId;

    if (!isRealtor && !isPropertyOwner && !isTeamOwner && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não pode gerar link de chat para este lead." },
        { status: 403 }
      );
    }

    let token: string | null = lead.clientChatToken || null;

    if (!token) {
      token = crypto.randomBytes(32).toString("hex");

      const updated = await (prisma as any).lead.update({
        where: { id },
        data: {
          clientChatToken: token,
        },
        select: {
          clientChatToken: true,
        },
      });

      token = updated.clientChatToken || null;
    }

    if (!token) {
      return NextResponse.json(
        { error: "Não conseguimos gerar o link de chat agora." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error("Error generating client chat token:", error);
    return NextResponse.json(
      { error: "Não conseguimos gerar o link de chat agora. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
