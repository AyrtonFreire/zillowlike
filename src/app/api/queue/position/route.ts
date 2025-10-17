import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/queue-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const realtorId = searchParams.get("realtorId");

    if (!realtorId) {
      return NextResponse.json(
        { error: "realtorId is required" },
        { status: 400 }
      );
    }

    const position = await QueueService.getPosition(realtorId);

    if (!position) {
      return NextResponse.json(
        { error: "Corretor não está na fila" },
        { status: 404 }
      );
    }

    return NextResponse.json(position);
  } catch (error) {
    console.error("Error getting queue position:", error);
    return NextResponse.json(
      { error: "Failed to get position" },
      { status: 500 }
    );
  }
}
