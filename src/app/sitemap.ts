import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/favorites`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/owner/new`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
  // Add guides root if exists
  urls.push({ url: `${base}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.5 });
  return urls;
}
