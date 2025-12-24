import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

const noteSchema = z.object({
  content: z.string().min(1, "Escreva uma nota antes de salvar.").max(2000, "A nota está muito longa."),
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

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        realtorId: true,
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

    const isTeamOwner = !!lead.team && lead.team.ownerId === userId;

    if (role !== "ADMIN" && lead.realtorId !== userId && !isTeamOwner) {
      return NextResponse.json({ error: "Você só pode ver notas dos seus próprios leads ou dos times que lidera." }, { status: 403 });
    }

    const notes = await prisma.leadNote.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching lead notes:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar as notas deste lead agora." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id },
      select: {
        id: true,
        realtorId: true,
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

    const isTeamOwner = !!lead.team && lead.team.ownerId === userId;

    if (role !== "ADMIN" && lead.realtorId !== userId && !isTeamOwner) {
      return NextResponse.json({ error: "Você só pode registrar notas dos leads que está atendendo ou dos times que lidera." }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = noteSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const note = await prisma.leadNote.create({
      data: {
        leadId: id,
        realtorId: userId,
        content: parsed.data.content.trim(),
      },
    });

    await LeadEventService.record({
      leadId: id,
      type: "NOTE_ADDED",
      actorId: userId,
      actorRole: role,
      title: "Nota adicionada",
      description: parsed.data.content.trim().slice(0, 200),
    });

    if (lead.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(lead.realtorId));
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error creating lead note:", error);
    return NextResponse.json(
      { error: "Não conseguimos salvar esta nota agora. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }
}
