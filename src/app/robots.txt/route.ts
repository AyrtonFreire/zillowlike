import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://zillowlike.vercel.app";
  const body = `User-agent: *\nAllow: /\nSitemap: ${base.replace(/\/$/, "")}/sitemap.xml`;
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
