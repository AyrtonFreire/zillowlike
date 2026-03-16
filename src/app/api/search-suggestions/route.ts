import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/cache";
import { withRateLimit } from "@/lib/rate-limiter";

type LocationSuggestion = {
  kind: "location";
  label: string;
  city: string;
  state: string;
  neighborhood: string | null;
  count: number;
};

type AgencySuggestion = {
  kind: "agency";
  label: string;
  agencyId: string;
  count: number;
  publicSlug: string | null;
  userId: string;
};

type RealtorSuggestion = {
  kind: "realtor";
  label: string;
  realtorId: string;
  count: number;
  publicSlug: string | null;
};

type OwnerSuggestion = {
  kind: "owner";
  label: string;
  ownerId: string;
  count: number;
  publicSlug: string | null;
};

type Suggestion = LocationSuggestion | AgencySuggestion | RealtorSuggestion | OwnerSuggestion;

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();

    const setCaching = (res: NextResponse) => {
      const ttl = query.length > 0 ? 300 : 900;
      const swr = query.length > 0 ? 600 : 1800;
      res.headers.set("Cache-Control", `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`);
      return res;
    };

    if (query.length > 0 && query.length < 2) {
      return setCaching(NextResponse.json({ success: true, suggestions: [] as Suggestion[] }));
    }

    if (query.length > 0) {
      const cacheKey = `search-suggestions:q:${query.toLowerCase()}`;

      const suggestions = await withCache(cacheKey, 300, async () => {
        const out: Suggestion[] = [];

        const topCity = await prisma.property.groupBy({
          by: ["city", "state"],
          where: {
            status: "ACTIVE",
            city: { contains: query, mode: "insensitive" },
          },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 1,
        });

        if (topCity.length > 0) {
          const city = topCity[0].city as string;
          const state = topCity[0].state as string;
          const cityCount = topCity[0]._count.id as number;

          const hoods = await prisma.property.groupBy({
            by: ["neighborhood"],
            where: {
              status: "ACTIVE",
              city,
              neighborhood: { not: null },
            },
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
            take: 10,
          });

          out.push({
            kind: "location",
            label: `${city}, ${state}`,
            city,
            state,
            neighborhood: null,
            count: cityCount,
          });

          for (const h of hoods as any[]) {
            out.push({
              kind: "location",
              label: `${h.neighborhood}, ${city}, ${state}`,
              city,
              state,
              neighborhood: h.neighborhood as string,
              count: h._count.id as number,
            });
          }
        } else {
          const fallback = await prisma.property.groupBy({
            by: ["city", "state", "neighborhood"],
            where: {
              status: "ACTIVE",
              OR: [
                { city: { contains: query, mode: "insensitive" } },
                { neighborhood: { contains: query, mode: "insensitive" } },
              ],
            },
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
            take: 10,
          });

          for (const loc of fallback as any[]) {
            out.push({
              kind: "location",
              label: `${loc.neighborhood ? loc.neighborhood + ", " : ""}${loc.city}${loc.state ? ", " + loc.state : ""}`,
              city: loc.city as string,
              state: loc.state as string,
              neighborhood: (loc.neighborhood as string | null) ?? null,
              count: loc._count.id as number,
            });
          }
        }

        if (query.length < 3) return out;

        const agencies = await (prisma as any).agencyProfile.findMany({
          where: {
            name: { contains: query, mode: "insensitive" },
          },
          select: {
            name: true,
            teamId: true,
            userId: true,
            user: {
              select: {
                publicSlug: true,
              },
            },
          },
          take: 8,
        });

        if (agencies.length > 0) {
          for (const a of agencies as any[]) {
            const teamId = String(a.teamId);
            out.push({
              kind: "agency",
              label: String(a.name || "Imobiliária"),
              agencyId: teamId,
              count: 0,
              publicSlug: a?.user?.publicSlug ? String(a.user.publicSlug) : null,
              userId: String(a.userId),
            });
          }
        }

        const realtors = await prisma.user.findMany({
          where: {
            role: "REALTOR",
            name: { contains: query, mode: "insensitive" },
          },
          select: {
            id: true,
            name: true,
            publicSlug: true,
          },
          take: 8,
        });

        if (realtors.length > 0) {
          for (const r of realtors) {
            const id = String(r.id);
            out.push({
              kind: "realtor",
              label: String(r.name || "Corretor"),
              realtorId: id,
              count: 0,
              publicSlug: (r as any)?.publicSlug ? String((r as any).publicSlug) : null,
            });
          }
        }

        const owners = await prisma.user.findMany({
          where: {
            role: { in: ["OWNER", "USER"] as any },
            publicProfileEnabled: true,
            name: { contains: query, mode: "insensitive" },
          },
          select: {
            id: true,
            name: true,
            publicSlug: true,
          },
          take: 8,
        });

        if (owners.length > 0) {
          for (const o of owners) {
            out.push({
              kind: "owner",
              label: String(o.name || "Proprietário"),
              ownerId: String(o.id),
              count: 0,
              publicSlug: (o as any)?.publicSlug ? String((o as any).publicSlug) : null,
            });
          }
        }

        return out;
      });

      return setCaching(NextResponse.json({ success: true, suggestions }));
    }

    const cacheKey = "search-suggestions:popular-cities";
    const suggestions = await withCache(cacheKey, 900, async () => {
      const popularCities = await prisma.property.groupBy({
        by: ["city", "state"],
        where: { status: "ACTIVE" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      });

      return (popularCities as any[]).map((c: any) => ({
        kind: "location",
        label: `${c.city}${c.state ? ", " + c.state : ""}`,
        city: c.city as string,
        state: c.state as string,
        neighborhood: null as string | null,
        count: c._count.id as number,
      })) as Suggestion[];
    });

    return setCaching(NextResponse.json({ success: true, suggestions }));
  } catch (error) {
    console.error("Error fetching search suggestions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch search suggestions" },
      { status: 500 }
    );
  }
}, "searchSuggestions");
