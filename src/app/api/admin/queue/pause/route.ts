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
    const { queue: queueName } = body;

    if (!queueName) {
      return NextResponse.json({ error: "Queue name required" }, { status: 400 });
    }

    const queues = getQueues();
    const queue = queues[queueName as keyof typeof queues];

    if (!queue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    await queue.pause();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Queue pause error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
