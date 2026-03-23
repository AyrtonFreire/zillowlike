import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadConversationLifecycleService } from "@/lib/lead-conversation-lifecycle";

const PatchSchema = z.object({
  action: z.enum(["archive", "reopen", "close"]),
});

function canAccessLead(role: string | null, userId: string, lead: any) {
  if (role === "ADMIN") return true;
  if (lead.realtorId && String(lead.realtorId) === String(userId)) return true;
  if (lead.userId && String(lead.userId) === String(userId)) return true;
  if (lead.property?.ownerId && String(lead.property.ownerId) === String(userId)) return true;
  if (lead.team?.ownerId && String(lead.team.ownerId) === String(userId)) return true;
  return false;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (role === "AGENCY") {
      return NextResponse.json({ error: "Perfil de agência não pode alterar a conversa do lead diretamente." }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id: String(id) },
      select: {
        id: true,
        realtorId: true,
        userId: true,
        conversationState: true,
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

    if (!canAccessLead(String(role || ""), String(userId), lead)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    let updated;
    if (parsed.data.action === "archive") {
      updated = await LeadConversationLifecycleService.archiveConversation(String(id), {
        actorId: String(userId),
        actorRole: String(role || ""),
        reason: "MANUAL_ARCHIVE",
      });
    } else if (parsed.data.action === "reopen") {
      updated = await LeadConversationLifecycleService.touchActivity(String(id), {
        actorId: String(userId),
        actorRole: String(role || ""),
        reason: "MANUAL_REOPEN",
        ensureToken: true,
      });
    } else {
      updated = await LeadConversationLifecycleService.closeConversation(String(id), {
        actorId: String(userId),
        actorRole: String(role || ""),
        reason: "MANUAL_CLOSE",
      });
    }

    return NextResponse.json({
      success: true,
      conversation: {
        state: String(updated.conversationState || "ACTIVE"),
        archivedAt: updated.conversationArchivedAt ? new Date(updated.conversationArchivedAt).toISOString() : null,
        closedAt: updated.conversationClosedAt ? new Date(updated.conversationClosedAt).toISOString() : null,
        lastActivityAt: updated.conversationLastActivityAt ? new Date(updated.conversationLastActivityAt).toISOString() : null,
        clientChatToken: updated.clientChatToken ? String(updated.clientChatToken) : null,
      },
    });
  } catch (error: any) {
    if (error?.message === "CONVERSATION_CLOSED") {
      return NextResponse.json({ error: "Esta conversa foi encerrada e não aceita reabertura automática." }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Não conseguimos atualizar esta conversa agora." },
      { status: 500 }
    );
  }
}
