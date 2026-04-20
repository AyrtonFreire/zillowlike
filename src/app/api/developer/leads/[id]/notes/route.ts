import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadEventService } from "@/lib/lead-event-service";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import {
  getDeveloperWorkspaceErrorStatus,
  resolveDeveloperWorkspaceForUser,
} from "@/lib/developer-workspace";

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

async function resolveDeveloperLeadAccess(leadId: string, userId: string, role: string | null) {
  const workspace = await resolveDeveloperWorkspaceForUser({
    userId: String(userId),
    authRole: role ? String(role) : null,
  });

  if (!workspace.allowed || !workspace.teamId) {
    return {
      ok: false as const,
      status: getDeveloperWorkspaceErrorStatus(workspace.reason),
      payload: {
        error:
          workspace.reason === "PROFILE_NOT_FOUND"
            ? "Perfil da incorporadora não encontrado"
            : "Acesso negado",
      },
    };
  }

  const lead = await (prisma as any).lead.findUnique({
    where: { id: String(leadId) },
    select: {
      id: true,
      realtorId: true,
      property: {
        select: {
          teamId: true,
        },
      },
    },
  });

  if (!lead?.id || !lead?.property?.teamId || String(lead.property.teamId) !== String(workspace.teamId)) {
    return {
      ok: false as const,
      status: 404,
      payload: { error: "Lead não encontrado neste workspace." },
    };
  }

  return {
    ok: true as const,
    workspace,
    lead,
  };
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const access = await resolveDeveloperLeadAccess(String(id), String(userId), role ? String(role) : null);
    if (!access.ok) {
      return NextResponse.json(access.payload, { status: access.status });
    }

    const notes = await prisma.leadNote.findMany({
      where: { leadId: String(id) },
      orderBy: { createdAt: "asc" },
    });

    const authorIds = Array.from(
      new Set(
        (notes || [])
          .map((note) => (note?.realtorId ? String(note.realtorId) : ""))
          .filter(Boolean)
      )
    );

    const authors = authorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    const authorMap = new Map<string, { id: string; name: string | null; email: string | null }>();
    for (const author of authors || []) {
      authorMap.set(String(author.id), {
        id: String(author.id),
        name: author.name ? String(author.name) : null,
        email: author.email ? String(author.email) : null,
      });
    }

    const items = (notes || []).map((note) => ({
      id: String(note.id),
      leadId: String(note.leadId),
      realtorId: String(note.realtorId),
      content: String(note.content || ""),
      createdAt: note.createdAt ? new Date(note.createdAt).toISOString() : null,
      author: authorMap.get(String(note.realtorId)) || null,
    }));

    return NextResponse.json({ notes: items });
  } catch (error) {
    console.error("Error fetching developer lead notes:", error);
    return NextResponse.json({ error: "Não conseguimos carregar as notas deste lead agora." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const access = await resolveDeveloperLeadAccess(String(id), String(userId), role ? String(role) : null);
    if (!access.ok) {
      return NextResponse.json(access.payload, { status: access.status });
    }

    const json = await req.json().catch(() => null);
    const parsed = noteSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const note = await prisma.leadNote.create({
      data: {
        leadId: String(id),
        realtorId: String(userId),
        content: parsed.data.content.trim(),
      },
    });

    await LeadEventService.record({
      leadId: String(id),
      type: "NOTE_ADDED",
      actorId: String(userId),
      actorRole: role,
      title: "Nota adicionada",
      description: parsed.data.content.trim().slice(0, 200),
    });

    if (access.lead?.realtorId) {
      try {
        await RealtorAssistantService.recalculateForRealtor(String(access.lead.realtorId));
      } catch {
        // ignore
      }
    }

    const author = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({
      note: {
        id: String(note.id),
        leadId: String(note.leadId),
        realtorId: String(note.realtorId),
        content: String(note.content || ""),
        createdAt: note.createdAt ? new Date(note.createdAt).toISOString() : null,
        author: author
          ? {
              id: String(author.id),
              name: author.name ? String(author.name) : null,
              email: author.email ? String(author.email) : null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error creating developer lead note:", error);
    return NextResponse.json({ error: "Não conseguimos salvar esta nota agora. Tente novamente em alguns instantes." }, { status: 500 });
  }
}
