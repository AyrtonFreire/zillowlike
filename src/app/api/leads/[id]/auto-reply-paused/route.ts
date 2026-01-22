import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    { error: "Este endpoint foi desativado. O assistente offline agora é automático (horário + presença)." },
    { status: 410 }
  );
}
