import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCache, CacheKey, CacheTTL } from '@/lib/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    const setCaching = (res: NextResponse) => {
      // Endpoint público, ótimo candidato para cache no CDN
      // - Com query: muda com mais frequência e tem mais variedade
      // - Sem query: lista de cidades populares
      const ttl = query.length > 0 ? 300 : 900;
      const swr = query.length > 0 ? 600 : 1800;
      res.headers.set('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${swr}`);
      return res;
    };

    // If user typed something, prioritize: City (first) + top neighborhoods in that city
    if (query.length > 0) {
      const cacheKey = `locations:q:${query.toLowerCase()}`;
      const suggestions = await withCache(cacheKey, 300, async () => {
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

          return [
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

        return fallback.map((loc: any) => ({
          label: `${loc.neighborhood ? loc.neighborhood + ', ' : ''}${loc.city}${loc.state ? ', ' + loc.state : ''}`,
          city: loc.city,
          state: loc.state,
          neighborhood: loc.neighborhood,
          count: loc._count.id as number,
        }));
      });

      return setCaching(NextResponse.json({ success: true, suggestions }));
    }

    // No query: return popular cities first (top by count)
    const cacheKey = 'locations:popular-cities';
    const suggestions = await withCache(cacheKey, 900, async () => {
      const popularCities = await prisma.property.groupBy({
        by: ['city', 'state'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      return popularCities.map((c: any) => ({
        label: `${c.city}${c.state ? ', ' + c.state : ''}`,
        city: c.city,
        state: c.state,
        neighborhood: null as string | null,
        count: c._count.id as number,
      }));
    });

    return setCaching(NextResponse.json({ success: true, suggestions }));
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
