import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/cache";
import { withRateLimit } from "@/lib/rate-limiter";

type AgencySuggestion = {
  kind: "agency";
  label: string;
  agencyId: string;
};

type RealtorSuggestion = {
  kind: "realtor";
  label: string;
  realtorId: string;
};

type Suggestion = AgencySuggestion | RealtorSuggestion;

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = (searchParams.get("q") || "").trim();

    const query = rawQuery.startsWith("@");

    const q = (query ? rawQuery.slice(1) : rawQuery).trim();

    const setCaching = (res: NextResponse) => {
      const ttl = q.length > 0 ? 300 : 900;
      const swr = q.length > 0 ? 600 : 1800;
      res.headers.set("Cache-Control", `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`);
      return res;
    };

    if (q.length > 0 && q.length < 2) {
      return setCaching(NextResponse.json({ success: true, suggestions: [] as Suggestion[] }));
    }

    if (!q.length) {
      return setCaching(NextResponse.json({ success: true, suggestions: [] as Suggestion[] }));
    }

    const cacheKey = `professionals-suggestions:q:${q.toLowerCase()}`;
    const suggestions = await withCache(cacheKey, 300, async () => {
      const out: Suggestion[] = [];

      const agencies = await (prisma as any).agencyProfile.findMany({
        where: {
          name: { contains: q, mode: "insensitive" },
        },
        select: {
          name: true,
          teamId: true,
        },
        take: 8,
      });

      for (const a of agencies as any[]) {
        out.push({
          kind: "agency",
          label: String(a.name || "Imobiliária"),
          agencyId: String(a.teamId),
        });
      }

      const realtors = await prisma.user.findMany({
        where: {
          role: "REALTOR",
          name: { contains: q, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
        },
        take: 8,
      });

      for (const r of realtors) {
        out.push({
          kind: "realtor",
          label: String(r.name || "Corretor"),
          realtorId: String(r.id),
        });
      }

      return out;
    });

    return setCaching(NextResponse.json({ success: true, suggestions }));
  } catch (error) {
    console.error("Error fetching professionals suggestions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch professionals suggestions" },
      { status: 500 }
    );
  }
}, "searchSuggestions");
