import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRealtorAssistantCategory } from "@/lib/realtor-assistant-ai";

type Counts = {
  ALL: number;
  Leads: number;
  Visitas: number;
  Lembretes: number;
  Outros: number;
};

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
    const leadId = url.searchParams.get("leadId") || null;

    const now = new Date();

    const baseWhere: any = {
      realtorId: String(userId),
      ...(leadId ? { leadId } : {}),
    };

    const activeWhere: any = {
      ...baseWhere,
      OR: [{ status: "ACTIVE" }, { status: "SNOOZED", snoozedUntil: { lte: now } }],
    };

    const [byType, agg] = await Promise.all([
      (prisma as any).realtorAssistantItem.groupBy({
        by: ["type"],
        where: activeWhere,
        _count: { _all: true },
      }),
      (prisma as any).realtorAssistantItem.aggregate({
        where: baseWhere,
        _max: { updatedAt: true },
        _count: { _all: true },
      }),
    ]);

    const counts: Counts = {
      ALL: 0,
      Leads: 0,
      Visitas: 0,
      Lembretes: 0,
      Outros: 0,
    };

    for (const row of Array.isArray(byType) ? byType : []) {
      const t = String((row as any)?.type || "");
      const c = Number((row as any)?._count?._all || 0);
      if (!c) continue;
      counts.ALL += c;
      const cat = getRealtorAssistantCategory(t);
      (counts as any)[cat] = Number((counts as any)[cat] || 0) + c;
    }

    const newestMs = agg?._max?.updatedAt ? new Date(agg._max.updatedAt).getTime() : 0;
    const total = Number(agg?._count?._all || 0);
    const key = `${String(userId)}:${leadId || "all"}`;
    const etag = `W/\"assistant-stats:${key}:${newestMs}:${total}:${counts.ALL}:${counts.Leads}:${counts.Visitas}:${counts.Lembretes}:${counts.Outros}\"`;

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

    const res = NextResponse.json({ success: true, counts });
    res.headers.set("ETag", etag);
    res.headers.set("Cache-Control", "private, max-age=0, must-revalidate");
    return res;
  } catch (error) {
    console.error("Error fetching assistant stats:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar o Assistente agora." },
      { status: 500 }
    );
  }
}
