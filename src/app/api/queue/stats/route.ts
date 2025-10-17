import { NextResponse } from "next/server";
import { QueueService } from "@/lib/queue-service";

export async function GET() {
  try {
    const stats = await QueueService.getQueueStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error getting queue stats:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
