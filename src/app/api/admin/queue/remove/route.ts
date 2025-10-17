import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getQueues } from "@/lib/queue/queues";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session as any).user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { queue: queueName, jobId } = body;

    if (!queueName || !jobId) {
      return NextResponse.json({ error: "Queue and jobId required" }, { status: 400 });
    }

    const queues = getQueues();
    const queue = queues[queueName as keyof typeof queues];

    if (!queue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await job.remove();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Queue remove error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
