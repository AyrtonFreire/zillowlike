import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { prisma } from "@/lib/prisma";

const PostSchema = z
  .object({
    leadId: z.string().min(1),
    draft: z.string().min(1).max(2000),
  })
  .strict();

export async function GET(req: NextRequest) {
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

    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId");

    const now = new Date();

    const baseWhere: any = {
      realtorId: String(userId),
      status: { in: ["ACTIVE", "SNOOZED"] },
      ...(leadId ? { leadId } : {}),
    };

    const [agg, effectiveActiveCount, snoozedFutureAgg] = await Promise.all([
      (prisma as any).realtorAssistantItem.aggregate({
        where: baseWhere,
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
      (prisma as any).realtorAssistantItem.count({
        where: {
          ...baseWhere,
          OR: [
            { status: "ACTIVE" },
            { status: "SNOOZED", snoozedUntil: { lte: now } },
          ],
        },
      }),
      (prisma as any).realtorAssistantItem.aggregate({
        where: {
          ...baseWhere,
          status: "SNOOZED",
          snoozedUntil: { gt: now },
        },
        _count: { _all: true },
        _min: { snoozedUntil: true },
      }),
    ]);

    const totalCount = Number(agg?._count?._all || 0);
    const maxUpdatedAt = agg?._max?.updatedAt ? new Date(agg._max.updatedAt).getTime() : 0;
    const snoozedFutureCount = Number(snoozedFutureAgg?._count?._all || 0);
    const nextWakeAtMs = snoozedFutureAgg?._min?.snoozedUntil
      ? new Date(snoozedFutureAgg._min.snoozedUntil).getTime()
      : 0;

    const key = `${String(userId)}:${leadId || "all"}`;
    const etag = `W/\"assistant-items:${key}:${maxUpdatedAt}:${totalCount}:${effectiveActiveCount}:${snoozedFutureCount}:${nextWakeAtMs}\"`;

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      });
    }

    const items = await RealtorAssistantService.list(String(userId), {
      leadId: leadId || undefined,
    });

    const res = NextResponse.json({ success: true, items });
    res.headers.set("ETag", etag);
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res;
  } catch (error) {
    console.error("Error fetching assistant items:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar o Assistente agora." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const leadId = String(parsed.data.leadId);
    const draft = String(parsed.data.draft).trim();

    const lead: any = await (prisma as any).lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        realtorId: true,
        team: {
          select: {
            ownerId: true,
          },
        },
        contact: { select: { name: true } },
        property: { select: { title: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const isTeamOwner = !!lead.team && String(lead.team.ownerId) === String(userId);
    const isAssignedRealtor = lead.realtorId && String(lead.realtorId) === String(userId);
    if (role !== "ADMIN" && !isAssignedRealtor && !isTeamOwner) {
      return NextResponse.json(
        { error: "Você só pode criar tarefas para leads que está atendendo ou dos times que lidera." },
        { status: 403 }
      );
    }

    const clientName = lead.contact?.name ? String(lead.contact.name) : "o cliente";
    const propertyTitle = lead.property?.title ? String(lead.property.title) : null;
    const title = "Responder lead";
    const message = propertyTitle
      ? `Responder ${clientName} sobre “${propertyTitle}”.`
      : `Responder ${clientName}.`;

    const dedupeKey = `AI_REPLY_TASK:${leadId}`;
    const dueAt = new Date();
    dueAt.setMinutes(dueAt.getMinutes() + 30);

    const item = await RealtorAssistantService.upsertFromRule({
      realtorId: String(userId),
      leadId,
      type: "UNANSWERED_CLIENT_MESSAGE",
      priority: "HIGH",
      title,
      message,
      dueAt,
      dedupeKey,
      primaryAction: { type: "OPEN_CHAT", leadId },
      secondaryAction: { type: "OPEN_LEAD", leadId },
      metadata: {
        source: "AI",
        draft,
      },
    });

    try {
      await RealtorAssistantService.emitItemUpdated(String(userId), item);
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Error creating assistant item:", error);
    return NextResponse.json({ error: "Não conseguimos criar esta tarefa agora." }, { status: 500 });
  }
}
