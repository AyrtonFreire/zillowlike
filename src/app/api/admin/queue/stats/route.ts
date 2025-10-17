import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getQueues } from "@/lib/queue/queues";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || (session as any).user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const queues = getQueues();
    const stats = await Promise.all(
      Object.entries(queues).map(async ([name, queue]) => {
        const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
          queue.isPaused(),
        ]);

        return {
          name,
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused: isPaused,
        };
      })
    );

    return NextResponse.json({ queues: stats });
  } catch (err: any) {
    console.error("Queue stats error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
