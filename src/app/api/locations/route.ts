import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Buscar cidades únicas com imóveis ativos
    const locations = await prisma.property.groupBy({
      by: ['city', 'state', 'neighborhood'],
      where: {
        status: 'ACTIVE',
        ...(query && {
          OR: [
            { city: { contains: query, mode: 'insensitive' } },
            { neighborhood: { contains: query, mode: 'insensitive' } },
          ],
        }),
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Formatar resultados
    const suggestions = locations.map((loc: any) => {
      const parts: string[] = [];
      if (loc.neighborhood) parts.push(loc.neighborhood);
      parts.push(loc.city);
      if (loc.state) parts.push(loc.state);
      
      return {
        label: parts.join(', '),
        city: loc.city,
        state: loc.state,
        neighborhood: loc.neighborhood,
        count: loc._count.id,
      };
    });

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
