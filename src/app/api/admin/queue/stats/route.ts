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
      Object.entries(queues)
        .filter(([, queue]) => !!queue)
        .map(async ([name, queue]) => {
          const q = queue!;
          const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
            q.getWaitingCount(),
            q.getActiveCount(),
            q.getCompletedCount(),
            q.getFailedCount(),
            q.getDelayedCount(),
            q.isPaused(),
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
