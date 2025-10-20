import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Update database
  // await prisma.notification.update({
  //   where: { id: params.id, userId: session.user.id },
  //   data: { read: true }
  // });

  return NextResponse.json({ success: true });
}
