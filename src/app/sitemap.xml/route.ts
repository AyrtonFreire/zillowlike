import { NextResponse } from "next/server";

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://zillowlike.vercel.app").replace(/\/$/, "");
  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+
  `  <url><loc>${base}/</loc><lastmod>${now}</lastmod><changefreq>hourly</changefreq><priority>0.8</priority></url>\n`+
  `  <url><loc>${base}/compare</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>\n`+
  `</urlset>`;
  return new NextResponse(xml, { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
