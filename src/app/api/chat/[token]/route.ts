import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const messageSchema = z.object({
  content: z
    .string()
    .min(1, "Escreva uma mensagem antes de enviar.")
    .max(2000, "A mensagem está muito longa."),
});

export async function GET(_req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;

    const lead: any = await (prisma as any).lead.findFirst({
      where: { clientChatToken: token },
      select: {
        id: true,
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
          },
        },
        clientMessages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fromClient: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Chat não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        property: lead.property,
        contact: lead.contact,
      },
      messages: lead.clientMessages,
    });
  } catch (error) {
    console.error("Error fetching client chat:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar este chat agora." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const json = await req.json().catch(() => null);
    const parsed = messageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const session: any = await getServerSession(authOptions).catch(() => null);

    const lead: any = await (prisma as any).lead.findFirst({
      where: { clientChatToken: token },
      select: {
        id: true,
        realtorId: true,
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
      return NextResponse.json({ error: "Chat não encontrado" }, { status: 404 });
    }

    let fromClient = true;

    if (session) {
      const userId = session.userId || session.user?.id;
      const role = session.role || session.user?.role;

      if (userId && (role === "REALTOR" || role === "AGENCY" || role === "OWNER" || role === "ADMIN")) {
        const isRealtor = lead.realtorId && lead.realtorId === userId;
        const isPropertyOwner = lead.property?.ownerId && lead.property.ownerId === userId;
        const isTeamOwner = lead.team?.ownerId && lead.team.ownerId === userId;

        if (!isRealtor && !isPropertyOwner && !isTeamOwner && role !== "ADMIN") {
          return NextResponse.json(
            { error: "Você não pode enviar mensagens para este chat." },
            { status: 403 }
          );
        }

        fromClient = false;
      }
    }

    const message = await (prisma as any).leadClientMessage.create({
      data: {
        leadId: lead.id,
        fromClient,
        content: parsed.data.content.trim(),
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Error posting client chat message:", error);
    return NextResponse.json(
      { error: "Não conseguimos enviar esta mensagem agora. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
