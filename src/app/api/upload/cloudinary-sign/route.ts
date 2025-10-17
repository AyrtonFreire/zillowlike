import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { folder = "zillowlike", public_id, eager } = body || {};

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary env vars missing" }, { status: 500 });
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // Build the string to sign in Cloudinary format (keys sorted asc)
  const params: Record<string, any> = { folder, timestamp };
  if (public_id) params.public_id = public_id;
  if (eager) params.eager = eager;

  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&") + apiSecret;

  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
  });
}
