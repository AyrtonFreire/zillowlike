import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const secret = process.env.CLIENT_LOG_SECRET;

    if (isProd) {
      if (!secret) {
        return NextResponse.json({ ok: false }, { status: 404 });
      }
      const header = req.headers.get("x-client-log-secret");
      if (header !== secret) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const body = await req.json();
    // Basic structured log in dev; in prod this could sink to a provider
    console.log("client-log:", JSON.stringify(body));
  } catch (e) {
    console.error("/api/logs parse error", e);
  }
  return NextResponse.json({ ok: true });
}
