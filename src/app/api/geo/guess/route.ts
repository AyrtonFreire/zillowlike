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

function normalizeCityName(input?: string | null): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  const maybeEncoded = raw.replace(/\+/g, " ");
  try {
    return decodeURIComponent(maybeEncoded);
  } catch {
    return raw;
  }
}

function normalizeStateToUF(input?: string | null): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  const key = raw.toLowerCase();
  return STATE_UF_BY_NAME[key] || null;
}

export async function GET(req: NextRequest) {
  const h = req.headers;

  const vercelCity = h.get("x-vercel-ip-city") || h.get("x-vercel-city");
  const vercelRegion = h.get("x-vercel-ip-country-region") || h.get("x-vercel-ip-country-region-name");
  const vercelCountry = (h.get("x-vercel-ip-country") || "").toUpperCase();

  const cfCity = h.get("cf-ipcity") || h.get("cf-city");
  const cfRegion = h.get("cf-region") || h.get("cf-region-code");
  const cfCountry = (h.get("cf-ipcountry") || "").toUpperCase();

  const city = normalizeCityName(vercelCity || cfCity) || null;
  const state = normalizeStateToUF(vercelRegion || cfRegion) || null;

  const source = city
    ? vercelCity
      ? "vercel"
      : cfCity
      ? "cloudflare"
      : "headers"
    : "none";

  const country = vercelCountry || cfCountry || null;

  return NextResponse.json({
    success: true,
    city,
    state,
    country,
    source,
  });
}
