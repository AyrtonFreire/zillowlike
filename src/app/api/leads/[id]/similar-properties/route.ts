import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SimilarPropertiesService } from "@/lib/similar-properties-service";
import { LeadEventService } from "@/lib/lead-event-service";
import { randomBytes } from "crypto";

async function getSessionContext() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    return { userId: null as string | null, role: null as string | null };
  }

  const userId = (session.userId || session.user?.id || null) as string | null;
  const role = (session.role || session.user?.role || null) as string | null;

  return { userId, role };
}

async function getLeadWithAccessGuard(leadId: string, userId: string, role: string | null) {
  const lead: any = await (prisma as any).lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      status: true,
      pipelineStage: true,
      realtorId: true,
      team: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!lead) {
    return { lead: null, error: NextResponse.json({ error: "Lead não encontrado" }, { status: 404 }) };
  }

  const isTeamOwner = !!lead.team && lead.team.ownerId === userId;

  if (role !== "ADMIN" && lead.realtorId !== userId && !isTeamOwner) {
    return {
      lead: null,
      error: NextResponse.json(
        {
          error:
            "Você só pode usar esta funcionalidade nos leads que está atendendo ou dos times que lidera.",
        },
        { status: 403 }
      ),
    };
  }

  return { lead, error: null as NextResponse | null };
}

function getBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  return base.replace(/\/$/, "");
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const rawLimit = Number(searchParams.get("limit") || "12");
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 12;

    const { lead, error } = await getLeadWithAccessGuard(id, userId, role);
    if (!lead) {
      return error as NextResponse;
    }

    const items = await SimilarPropertiesService.findForLead(id, userId, { limit });

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Error fetching similar properties:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar imóveis similares agora." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { userId, role } = await getSessionContext();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await context.params;
    const { lead, error } = await getLeadWithAccessGuard(id, userId, role);
    if (!lead) {
      return error as NextResponse;
    }

    const body = (await req.json().catch(() => ({}))) as {
      propertyIds?: string[];
      title?: string | null;
      message?: string | null;
      expiresInDays?: number | null;
    };

    let propertyIds = Array.isArray(body.propertyIds)
      ? body.propertyIds.filter((v) => typeof v === "string" && v.trim().length > 0)
      : [];

    if (propertyIds.length === 0) {
      const items = await SimilarPropertiesService.findForLead(id, userId, { limit: 20 });
      propertyIds = items.map((it) => it.property.id);
    }

    const ordered: string[] = [];
    for (const pid of propertyIds) {
      if (!ordered.includes(pid)) {
        ordered.push(pid);
      }
    }

    if (ordered.length === 0) {
      return NextResponse.json(
        { error: "Não há imóveis no seu estoque que se pareçam com este ainda." },
        { status: 400 }
      );
    }

    if (ordered.length > 50) {
      return NextResponse.json(
        { error: "A lista não pode ter mais do que 50 imóveis." },
        { status: 400 }
      );
    }

    const properties = await prisma.property.findMany({
      where: {
        id: { in: ordered },
        ownerId: userId,
      },
      select: {
        id: true,
      },
    });

    if (properties.length !== ordered.length) {
      return NextResponse.json(
        {
          error:
            "Alguns imóveis informados não pertencem ao seu estoque ou não existem mais.",
        },
        { status: 400 }
      );
    }

    const rawDays = typeof body.expiresInDays === "number" ? body.expiresInDays : 14;
    const expiresInDays = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(Math.round(rawDays), 60) : 14;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const token = randomBytes(32).toString("hex");

    const title = body.title && body.title.trim().length > 0 ? body.title.trim().slice(0, 160) : null;
    const message = body.message && body.message.trim().length > 0 ? body.message.trim().slice(0, 2000) : null;

    const list = await (prisma as any).leadRecommendationList.create({
      data: {
        leadId: id,
        realtorId: userId,
        token,
        title,
        message,
        propertyIds: ordered,
        filters: null,
        expiresAt,
      },
    });

    const baseUrl = getBaseUrl();
    const shareUrl = baseUrl ? `${baseUrl}/explore/${list.token}` : `/explore/${list.token}`;

    try {
      await LeadEventService.record({
        leadId: id,
        type: "SIMILAR_LIST_SHARED",
        actorId: userId,
        actorRole: role,
        title: title || "Lista de imóveis similares enviada",
        metadata: {
          token: list.token,
          propertyIds: ordered,
          expiresAt: list.expiresAt.toISOString(),
          propertyCount: ordered.length,
        },
      });
    } catch (err) {
      console.error("Error recording SIMILAR_LIST_SHARED event:", err);
    }

    return NextResponse.json({
      success: true,
      shareUrl,
      token: list.token,
      expiresAt: list.expiresAt,
      propertyCount: ordered.length,
    });
  } catch (error) {
    console.error("Error creating similar properties list:", error);
    return NextResponse.json(
      { error: "Não conseguimos gerar o link de imóveis similares agora." },
      { status: 500 }
    );
  }
}
