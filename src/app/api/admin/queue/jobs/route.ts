import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getQueues } from "@/lib/queue/queues";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session as any).user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const queueName = searchParams.get("queue");
    const type = searchParams.get("type") || "waiting";

    if (!queueName) {
      return NextResponse.json({ error: "Queue name required" }, { status: 400 });
    }

    const queues = getQueues();
    const queue = queues[queueName as keyof typeof queues];

    if (!queue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    let jobs: any[] = [];
    const limit = 50;

    switch (type) {
      case "waiting":
        jobs = await queue.getWaiting(0, limit);
        break;
      case "active":
        jobs = await queue.getActive(0, limit);
        break;
      case "completed":
        jobs = await queue.getCompleted(0, limit);
        break;
      case "failed":
        jobs = await queue.getFailed(0, limit);
        break;
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const serialized = jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress || 0,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    }));

    return NextResponse.json({ jobs: serialized });
  } catch (err: any) {
    console.error("Queue jobs error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
