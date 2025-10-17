import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Basic structured log in dev; in prod this could sink to a provider
    console.log("client-log:", JSON.stringify(body));
  } catch (e) {
    console.error("/api/logs parse error", e);
  }
  return NextResponse.json({ ok: true });
}
