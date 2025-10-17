import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channel = params.get("channel_name");

    if (!socketId || !channel) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 }
      );
    }

    // TODO: Verificar autenticação do usuário aqui
    // const session = await getServerSession();
    // if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pusher = getPusherServer();
    const auth = pusher.authorizeChannel(socketId, channel);

    return NextResponse.json(auth);
  } catch (error) {
    console.error("Error authenticating pusher:", error);
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
    );
  }
}
