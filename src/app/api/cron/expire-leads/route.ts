import { NextRequest, NextResponse } from "next/server";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

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

export async function POST(req: NextRequest) {
  try {
    const auth = authorizeCron(req);
    if (!auth.ok) return auth.response;

    const released = await LeadDistributionService.releaseExpiredReservations();

    return NextResponse.json({
      success: true,
      released,
    });
  } catch (error) {
    console.error("Error releasing expired reservations:", error);
    return NextResponse.json({ error: "Erro ao expirar reservas." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = authorizeCron(req);
    if (!auth.ok) return auth.response;

    const mode = (req.nextUrl.searchParams.get("mode") || "run").toLowerCase();
    if (mode === "status") {
      return NextResponse.json({
        success: true,
        ready: true,
      });
    }

    const released = await LeadDistributionService.releaseExpiredReservations();

    return NextResponse.json({
      success: true,
      released,
    });
  } catch (error) {
    console.error("Error releasing expired reservations:", error);
    return NextResponse.json({ error: "Erro ao expirar reservas." }, { status: 500 });
  }
}
