import { NextRequest, NextResponse } from "next/server";
import { LeadDistributionService } from "@/lib/lead-distribution-service";

/**
 * Cron job para liberar leads que expiraram (corretor não aceitou em 10 min)
 * 
 * Configurar na Vercel:
 * vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-leads",
 *     "schedule": "* * * * *"  // A cada 1 minuto
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar authorization header (Vercel Cron secret)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Liberar leads expirados
    const expiredCount = await LeadDistributionService.releaseExpiredReservations();

    console.log(`[CRON] Expired leads released: ${expiredCount}`);

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error expiring leads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
