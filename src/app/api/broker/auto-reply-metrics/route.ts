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

    const counts = await (prisma as any).leadAutoReplyLog.groupBy({
      by: ["decision"],
      where: {
        realtorId: user.id,
        createdAt: { gte: since },
      },
      _count: { _all: true },
    });

    const sentCount = Number(counts.find((c: any) => c.decision === "SENT")?._count?._all || 0);
    const skippedCount = Number(counts.find((c: any) => c.decision === "SKIPPED")?._count?._all || 0);
    const failedCount = Number(counts.find((c: any) => c.decision === "FAILED")?._count?._all || 0);

    const skippedByReasonRaw = await (prisma as any).leadAutoReplyLog.groupBy({
      by: ["reason"],
      where: {
        realtorId: user.id,
        createdAt: { gte: since },
        decision: "SKIPPED",
      },
      _count: { _all: true },
      orderBy: { _count: { _all: "desc" } },
      take: 8,
    });

    const skippedByReason = (Array.isArray(skippedByReasonRaw) ? skippedByReasonRaw : []).map((row: any) => ({
      reason: row.reason ? String(row.reason) : "(sem motivo)",
      count: Number(row?._count?._all || 0),
    }));

    const recent = await (prisma as any).leadAutoReplyLog.findMany({
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

    return NextResponse.json({
      range: label,
      since,
      enabled: Boolean(settings.enabled),
      counts: {
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
      },
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
