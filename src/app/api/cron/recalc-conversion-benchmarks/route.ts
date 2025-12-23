import { NextRequest, NextResponse } from "next/server";
import { recalcConversionBenchmarks } from "@/lib/conversion-benchmarks";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await recalcConversionBenchmarks();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[CRON] Error recalculating conversion benchmarks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
