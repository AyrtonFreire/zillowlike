import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPropertyPath, slugify } from "@/lib/slug";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";

    const requiredToken = process.env.SEO_SMOKE_TOKEN;
    if (requiredToken && token !== requiredToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

    const property = await (prisma as any).property.findFirst({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        metaTitle: true,
        metaDescription: true,
        description: true,
        city: true,
        state: true,
        updatedAt: true,
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!property) {
      return NextResponse.json(
        {
          ok: false,
          message: "no_active_property_found",
        },
        { status: 404 }
      );
    }

    const canonicalPath = buildPropertyPath(property.id, property.title);
    const canonicalUrl = `${base}${canonicalPath}`;
    const expectedSlug = slugify(property.title);

    const title = property.metaTitle && String(property.metaTitle).trim()
      ? String(property.metaTitle).trim()
      : `${property.title} | Zillowlike`;

    const description = property.metaDescription && String(property.metaDescription).trim()
      ? String(property.metaDescription).trim()
      : `${String(property.description || "").slice(0, 160)}${String(property.description || "").length > 160 ? "..." : ""}`;

    const image = property.images?.[0]?.url || null;

    const response = NextResponse.json(
      {
        ok: true,
        base,
        property: {
          id: property.id,
          title: property.title,
          city: property.city,
          state: property.state,
          updatedAt: property.updatedAt,
        },
        canonical: {
          path: canonicalPath,
          url: canonicalUrl,
          expectedSlug,
        },
        meta: {
          title,
          description,
          metaTitle: property.metaTitle || null,
          metaDescription: property.metaDescription || null,
          ogImage: image,
          titleLength: title.length,
          descriptionLength: description.length,
        },
        endpoints: {
          sitemap: `${base}/sitemap.xml`,
          robots: `${base}/robots.txt`,
        },
      },
      { status: 200 }
    );

    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("SEO smoke error:", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
