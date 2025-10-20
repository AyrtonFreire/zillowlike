import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCache, CacheKey, CacheTTL } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    // If user typed something, prioritize: City (first) + top neighborhoods in that city
    if (query.length > 0) {
      const cacheKey = `locations:q:${query.toLowerCase()}`;
      const cached = await withCache(cacheKey, 60, async () => {
        // original logic placed here will return the array of suggestions
        return null as any; // placeholder to satisfy TS, replaced below
      });
      if (Array.isArray(cached) && cached.length > 0) {
        return NextResponse.json({ success: true, suggestions: cached });
      }
      // 1) Find the best matching city by count
      const topCity = await prisma.property.groupBy({
        by: ['city', 'state'],
        where: {
          status: 'ACTIVE',
          city: { contains: query, mode: 'insensitive' },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      });

      if (topCity.length > 0) {
        const city = topCity[0].city as string;
        const state = topCity[0].state as string;
        const cityCount = topCity[0]._count.id as number;

        // 2) Top neighborhoods for that city
        const hoods = await prisma.property.groupBy({
          by: ['neighborhood'],
          where: {
            status: 'ACTIVE',
            city,
            neighborhood: { not: null },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        });

        const suggestions = [
          {
            label: `${city}, ${state}`,
            city,
            state,
            neighborhood: null as string | null,
            count: cityCount,
          },
          ...hoods.map((h: any) => ({
            label: `${h.neighborhood}, ${city}, ${state}`,
            city,
            state,
            neighborhood: h.neighborhood as string,
            count: h._count.id as number,
          })),
        ];

        // store in cache (60s)
        await (async () => { try { await (await import('@/lib/cache')).cacheSet?.(cacheKey, suggestions, 60); } catch {} })();
        return NextResponse.json({ success: true, suggestions });
      }

      // If no city matched, fallback to general matching (neighborhood or city) by popularity
      const fallback = await prisma.property.groupBy({
        by: ['city', 'state', 'neighborhood'],
        where: {
          status: 'ACTIVE',
          OR: [
            { city: { contains: query, mode: 'insensitive' } },
            { neighborhood: { contains: query, mode: 'insensitive' } },
          ],
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      const suggestions = fallback.map((loc: any) => ({
        label: `${loc.neighborhood ? loc.neighborhood + ', ' : ''}${loc.city}${loc.state ? ', ' + loc.state : ''}`,
        city: loc.city,
        state: loc.state,
        neighborhood: loc.neighborhood,
        count: loc._count.id as number,
      }));

      await (async () => { try { await (await import('@/lib/cache')).cacheSet?.(cacheKey, suggestions, 60); } catch {} })();
      return NextResponse.json({ success: true, suggestions });
    }

    // No query: return popular cities first (top by count)
    const cacheKey = 'locations:popular-cities';
    // Try cache first (60s)
    // We'll compute if cache miss
    const popularCities = await prisma.property.groupBy({
      by: ['city', 'state'],
      where: { status: 'ACTIVE' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const suggestions = popularCities.map((c: any) => ({
      label: `${c.city}${c.state ? ', ' + c.state : ''}`,
      city: c.city,
      state: c.state,
      neighborhood: null as string | null,
      count: c._count.id as number,
    }));

    return NextResponse.json({ success: true, suggestions });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
