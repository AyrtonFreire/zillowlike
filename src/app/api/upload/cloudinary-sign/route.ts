import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Require authenticated session
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { folder: requestedFolder } = body || {};

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary env vars missing" }, { status: 500 });
  }

  // Short-lived TTL (<= 2 min)
  const timestamp = Math.floor(Date.now() / 1000);
  const ttlSeconds = 120;

  // Restrict folder to allowlist regardless of input
  const allowedFolder = "zillowlike"; // centralized assets root
  const folder = allowedFolder;

  // Build the string to sign in Cloudinary format (keys sorted asc)
  const params: Record<string, any> = { folder, timestamp };

  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&") + apiSecret;

  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const res = NextResponse.json({ cloudName, apiKey, timestamp, folder, signature, ttl: ttlSeconds });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
