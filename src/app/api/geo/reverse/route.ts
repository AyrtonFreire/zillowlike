import { NextRequest, NextResponse } from "next/server";

const STATE_UF_BY_NAME: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amapá: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  ceará: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  "espírito santo": "ES",
  goias: "GO",
  goiás: "GO",
  maranhao: "MA",
  maranhão: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  pará: "PA",
  paraiba: "PB",
  paraíba: "PB",
  parana: "PR",
  paraná: "PR",
  pernambuco: "PE",
  piaui: "PI",
  piauí: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  rondônia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  "são paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

function normalizeStateToUF(input?: string | null): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  const key = raw.toLowerCase();
  return STATE_UF_BY_NAME[key] || null;
}

const cache = new Map<string, { t: number; v: any }>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

    const lat = latStr != null ? Number(latStr) : NaN;
    const lng = lngStr != null ? Number(lngStr) : NaN;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ success: false, error: "Invalid lat/lng" }, { status: 400 });
    }

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && now - hit.t < 10 * 60_000) {
      return NextResponse.json({ success: true, ...hit.v, source: "cache" });
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "zillowlike/1.0 (personal non-commercial)",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: "Reverse geocode failed" }, { status: 502 });
    }

    const data = (await res.json()) as any;
    const address = data?.address || {};

    const cityRaw =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      null;

    const stateRaw = address.state || address.region || address.state_district || null;

    const city = typeof cityRaw === "string" ? cityRaw.trim() : null;
    const state = normalizeStateToUF(stateRaw);

    const payload = {
      city,
      state,
      displayName: typeof data?.display_name === "string" ? data.display_name : null,
      countryCode: typeof address?.country_code === "string" ? String(address.country_code).toUpperCase() : null,
    };

    cache.set(key, { t: now, v: payload });
    return NextResponse.json({ success: true, ...payload, source: "nominatim" });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
