import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const item = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        type: true,
        purpose: true,
        status: true,
        ownerId: true,
        street: true,
        neighborhood: true,
        city: true,
        state: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        bedrooms: true,
        bathrooms: true,
        areaM2: true,
        suites: true,
        parkingSpots: true,
        floor: true,
        furnished: true,
        petFriendly: true,
        condoFee: true,
        yearBuilt: true,
        allowRealtorBoard: true,
        hidePrice: true,
        hideExactAddress: true,
        hideCondoFee: true,
        hideIPTU: true,
        iptuYearly: true,
        hasBalcony: true,
        hasElevator: true,
        hasPool: true,
        hasGym: true,
        hasPlayground: true,
        hasPartyRoom: true,
        hasGourmet: true,
        hasConcierge24h: true,
        accRamps: true,
        accWideDoors: true,
        accAccessibleElevator: true,
        accTactile: true,
        comfortAC: true,
        comfortHeating: true,
        comfortSolar: true,
        comfortNoiseWindows: true,
        comfortLED: true,
        comfortWaterReuse: true,
        finishFloor: true,
        finishCabinets: true,
        finishCounterGranite: true,
        finishCounterQuartz: true,
        viewSea: true,
        viewCity: true,
        positionFront: true,
        positionBack: true,
        sunByRoomNote: true,
        petsSmall: true,
        petsLarge: true,
        condoRules: true,
        sunOrientation: true,
        yearRenovated: true,
        totalFloors: true,
        conditionTags: true,
        createdAt: true,
        updatedAt: true,
        images: {
          select: { id: true, url: true, alt: true, sortOrder: true, blurDataURL: true },
          orderBy: { sortOrder: "asc" },
        },
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            publicProfileEnabled: true,
            publicSlug: true,
          } as any,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const status = (item as any)?.status;
    const isActiveLike = status === "ACTIVE" || status === null || status === "" || typeof status === "undefined";

    if (!isActiveLike) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const res = NextResponse.json({ item });
    res.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    return res;
  } catch (e) {
    console.error("/api/public/properties/[id] GET error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
