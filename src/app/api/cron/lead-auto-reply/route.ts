import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LeadAutoReplyService } from "@/lib/lead-auto-reply-service";

function authorizeCron(req: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { ok: true };
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { ok: true };
}

async function processPending(limit: number) {
  const rows = await (prisma as any).leadAutoReplyJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { clientMessageId: true },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const res = await LeadAutoReplyService.processByClientMessageId(String(row.clientMessageId));
    if ((res as any)?.status === "SENT") sent++;
    else if ((res as any)?.status === "FAILED") failed++;
    else skipped++;
  }

  return { processed: rows.length, sent, skipped, failed };
}

export async function POST(req: NextRequest) {
  try {
    const auth = authorizeCron(req);
    if (!auth.ok) return auth.response;

    const limit = Math.max(1, Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10) || 20));
    const result = await processPending(limit);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Error processing lead auto-reply jobs:", error);
    return NextResponse.json({ error: "Erro ao processar auto-replies." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = authorizeCron(req);
    if (!auth.ok) return auth.response;

    const mode = (req.nextUrl.searchParams.get("mode") || "run").toLowerCase();
    if (mode === "status") {
      const pending = await (prisma as any).leadAutoReplyJob.count({ where: { status: "PENDING" } });
      const processing = await (prisma as any).leadAutoReplyJob.count({ where: { status: "PROCESSING" } });
      return NextResponse.json({ success: true, pending, processing });
    }

    const limit = Math.max(1, Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "20", 10) || 20));
    const result = await processPending(limit);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Error processing lead auto-reply jobs:", error);
    return NextResponse.json({ error: "Erro ao processar auto-replies." }, { status: 500 });
  }
}
