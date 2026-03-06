import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadAutoReplyService } from "@/lib/lead-auto-reply-service";

function parseRange(range: string | null): { since: Date; label: "24h" | "7d" } {
  const now = new Date();
  if (range === "7d") {
    return { since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), label: "7d" };
  }
  return { since: new Date(now.getTime() - 24 * 60 * 60 * 1000), label: "24h" };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (user.role !== "REALTOR" && user.role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { since, label } = parseRange(req.nextUrl.searchParams.get("range"));

    const settings = await LeadAutoReplyService.getSettings(user.id);

    let counts: any[] = [];
    try {
      counts = await (prisma as any).leadAutoReplyLog.groupBy({
        by: ["decision"],
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
        },
        _count: { _all: true },
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      counts = [];
    }

    const sentCount = Number(counts.find((c: any) => c.decision === "SENT")?._count?._all || 0);
    const skippedCount = Number(counts.find((c: any) => c.decision === "SKIPPED")?._count?._all || 0);
    const failedCount = Number(counts.find((c: any) => c.decision === "FAILED")?._count?._all || 0);

    let sentByReasonRaw: any[] = [];
    try {
      sentByReasonRaw = await (prisma as any).leadAutoReplyLog.groupBy({
        by: ["reason"],
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
          decision: "SENT",
        },
        _count: { _all: true },
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      sentByReasonRaw = [];
    }

    const sentByReason = (Array.isArray(sentByReasonRaw) ? sentByReasonRaw : []).map((row: any) => ({
      reason: row.reason ? String(row.reason) : "(sem motivo)",
      count: Number(row?._count?._all || 0),
    }));

    let promptVersionsRaw: any[] = [];
    try {
      promptVersionsRaw = await (prisma as any).leadAutoReplyLog.groupBy({
        by: ["promptVersion"],
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
          decision: "SENT",
        },
        _count: { _all: true },
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      promptVersionsRaw = [];
    }

    const promptVersions = (Array.isArray(promptVersionsRaw) ? promptVersionsRaw : [])
      .map((row: any) => ({
        promptVersion: row.promptVersion ? String(row.promptVersion) : "(sem versão)",
        count: Number(row?._count?._all || 0),
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 8);

    const quality = {
      aiJsonParseFailed: Number(sentByReason.find((x: any) => x.reason === "AI_JSON_PARSE_FAILED")?.count || 0),
      factualWithoutFacts: Number(sentByReason.find((x: any) => x.reason === "FACTUAL_WITHOUT_FACTS")?.count || 0),
      placesNearby: Number(sentByReason.find((x: any) => x.reason === "PLACES_NEARBY")?.count || 0),
      openAiKeyMissing: Number(sentByReason.find((x: any) => x.reason === "OPENAI_API_KEY_MISSING")?.count || 0),
    };

    let skippedByReasonRaw: any[] = [];
    try {
      skippedByReasonRaw = await (prisma as any).leadAutoReplyLog.groupBy({
        by: ["reason"],
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
          decision: "SKIPPED",
        },
        _count: { _all: true },
        orderBy: { _count: { reason: "desc" } },
        take: 8,
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      skippedByReasonRaw = [];
    }

    const skippedByReason = (Array.isArray(skippedByReasonRaw) ? skippedByReasonRaw : []).map((row: any) => ({
      reason: row.reason ? String(row.reason) : "(sem motivo)",
      count: Number(row?._count?._all || 0),
    }));

    let recent: any[] = [];
    try {
      recent = await (prisma as any).leadAutoReplyLog.findMany({
        where: {
          realtorId: user.id,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          leadId: true,
          decision: true,
          reason: true,
          createdAt: true,
          lead: {
            select: {
              property: { select: { title: true } },
              contact: { select: { name: true } },
            },
          },
        },
      });
    } catch (error: any) {
      if (error?.code !== "P2021") {
        throw error;
      }
      recent = [];
    }

    return NextResponse.json({
      range: label,
      since,
      enabled: Boolean(settings.enabled),
      counts: {
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      sentByReason,
      promptVersions,
      quality,
      skippedByReason,
      recent: (Array.isArray(recent) ? recent : []).map((row: any) => ({
        id: String(row.id),
        leadId: String(row.leadId),
        decision: String(row.decision),
        reason: row.reason ? String(row.reason) : null,
        createdAt: row.createdAt,
        propertyTitle: row.lead?.property?.title ? String(row.lead.property.title) : null,
        contactName: row.lead?.contact?.name ? String(row.lead.contact.name) : null,
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar métricas de auto-reply:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
