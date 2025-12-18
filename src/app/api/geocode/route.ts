import { NextRequest, NextResponse } from "next/server";

type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

function buildFreeformQuery(parts: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}) {
  const streetLine = [parts.street, parts.number].filter(Boolean).join(" ").trim();
  return [
    streetLine,
    parts.neighborhood,
    parts.city,
    parts.state,
    parts.postalCode,
    parts.country || "Brazil",
  ]
    .filter(Boolean)
    .join(", ")
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const street = (searchParams.get("street") || "").trim();
    const number = (searchParams.get("number") || "").trim();
    const neighborhood = (searchParams.get("neighborhood") || "").trim();
    const city = (searchParams.get("city") || "").trim();
    const state = (searchParams.get("state") || "").trim();
    const postalCode = (searchParams.get("postalCode") || "").trim();
    const country = (searchParams.get("country") || "Brazil").trim();

    const url = new URL("https://nominatim.openstreetmap.org/search");

    if (q) {
      url.searchParams.set("q", q);
    } else if (street || city || state || postalCode) {
      const streetLine = [street, number].filter(Boolean).join(" ").trim();
      if (streetLine) url.searchParams.set("street", streetLine);
      if (city) url.searchParams.set("city", city);
      if (state) url.searchParams.set("state", state);
      if (postalCode) url.searchParams.set("postalcode", postalCode);
      if (country) url.searchParams.set("country", country);
    } else {
      return NextResponse.json({ result: null, error: "Missing query" }, { status: 200 });
    }

    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": "zillowlike/1.0 (personal non-commercial)",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!res.ok) {
      const fallbackQuery = q || buildFreeformQuery({ street, number, neighborhood, city, state, postalCode, country });
      return NextResponse.json(
        {
          result: null,
          error: `Upstream geocoder error (${res.status})`,
          query: fallbackQuery,
        },
        { status: 200 }
      );
    }

    const data = (await res.json().catch(() => null)) as any;
    if (!Array.isArray(data) || data.length === 0) {
      const fallbackQuery = q || buildFreeformQuery({ street, number, neighborhood, city, state, postalCode, country });
      return NextResponse.json({ result: null, query: fallbackQuery }, { status: 200 });
    }

    const first = data[0];
    const result: GeocodeResult = {
      lat: Number(first.lat),
      lng: Number(first.lon),
      displayName: String(first.display_name || ""),
    };

    if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) {
      return NextResponse.json({ result: null, error: "Invalid geocoder response" }, { status: 200 });
    }

    return NextResponse.json({ result }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ result: null, error: e?.message || "Internal error" }, { status: 200 });
  }
}
