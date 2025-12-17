import { NextResponse } from "next/server";
import { initializeRecurringJobs } from "@/lib/queue/queues";

let workersStarted = false;

export async function POST() {
  try {
    if (workersStarted) {
      return NextResponse.json({
        message: "Schedules already initialized",
        status: "scheduled",
      });
    }

    await initializeRecurringJobs();
    workersStarted = true;

    return NextResponse.json({
      message: "Recurring jobs scheduled successfully",
      status: "scheduled",
      workers: [
        { name: "Release Expired Reservations", interval: "1 minute" },
        { name: "Distribute New Leads", interval: "2 minutes" },
        { name: "Expire Old Leads", interval: "5 minutes" },
        { name: "Recalculate Queue Positions", interval: "10 minutos" },
        { name: "Recalculate Assistant Items", interval: "10 minutos" },
        { name: "Cleanup Old Data", interval: "1 hour" },
      ],
    });
  } catch (error) {
    console.error("Error starting workers:", error);
    return NextResponse.json(
      { error: "Failed to start workers" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: workersStarted ? "scheduled" : "stopped",
    workers: [
      { name: "Release Expired Reservations", interval: "1 minute" },
      { name: "Distribute New Leads", interval: "2 minutes" },
      { name: "Expire Old Leads", interval: "5 minutes" },
      { name: "Recalculate Queue Positions", interval: "10 minutos" },
      { name: "Recalculate Assistant Items", interval: "10 minutos" },
      { name: "Cleanup Old Data", interval: "1 hour" },
    ],
  });
}
