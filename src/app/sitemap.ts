import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://zillowlike.vercel.app";
  const now = new Date();
  
  // Static pages
  const urls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/favorites`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/saved-searches`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/owner/new`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/financing`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    // Fetch all active properties
    const properties = await prisma.property.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    // Add property pages
    properties.forEach((property) => {
      urls.push({
        url: `${base}/property/${property.id}`,
        lastModified: property.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    });

    // Add city pages (group by city/state)
    const cities = await prisma.property.groupBy({
      by: ["city", "state"],
      where: { status: "ACTIVE" },
      _count: { id: true },
    });

    cities.forEach((city) => {
      urls.push({
        url: `${base}/?city=${encodeURIComponent(city.city)}&state=${city.state}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
  }

  return urls;
}
