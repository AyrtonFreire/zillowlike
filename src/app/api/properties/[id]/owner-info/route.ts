import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * API para verificar se imóvel é de corretor e retornar info de contato
 * Usado no frontend para decidir se mostra agendamento ou contato direto
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            role: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Imóvel não encontrado" },
        { status: 404 }
      );
    }

    const isRealtorProperty = property.owner?.role === "REALTOR";

    return NextResponse.json({
      propertyId: property.id,
      isRealtorProperty,
      owner: isRealtorProperty && property.owner
        ? {
            id: property.owner.id,
            name: property.owner.name,
            email: property.owner.email,
            phone: property.owner.phone,
            image: property.owner.image,
          }
        : null, // Não expõe dados do owner se não for corretor
    });
  } catch (error) {
    console.error("Error fetching property owner info:", error);
    return NextResponse.json(
      { error: "Failed to fetch property info" },
      { status: 500 }
    );
  }
}
