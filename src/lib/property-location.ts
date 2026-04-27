import { geocodeAddressParts } from "@/lib/geocode";

export type PropertyLocationAccuracy = "exact" | "street" | "neighborhood" | "city" | "none";
export type PropertyLocationSource = "stored" | "geocoded" | "fallback" | "none";
export type PropertyNearbyMode = "distance" | "region" | "disabled";
export type PropertyMapPresentation = "pin" | "circle" | "hidden";

export interface PropertyLocationInput {
  id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  street?: string | null;
  streetNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  hideExactAddress?: boolean | null;
  country?: string | null;
}

export interface PropertyLocationResolution {
  lat: number | null;
  lng: number | null;
  accuracy: PropertyLocationAccuracy;
  source: PropertyLocationSource;
  displayLabel: string;
  badgeLabel: string;
  precisionNote: string;
  mapEmptyMessage: string;
  poiTitle: string;
  poiEmptyMessage: string;
  nearbyMode: PropertyNearbyMode;
  nearbyTitle: string;
  nearbyDescription: string;
  nearbyEmptyMessage: string;
  similarTitle: string;
  canShowMap: boolean;
  canShowPois: boolean;
  canShowNearby: boolean;
  canShowDistanceLabels: boolean;
  isApproximate: boolean;
  mapPresentation: PropertyMapPresentation;
  mapRadiusMeters: number | null;
  zoom: number;
  query: string | null;
}

const cache = new Map<string, { t: number; v: PropertyLocationResolution }>();
const CACHE_TTL_MS = 30 * 60_000;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparableText(value: unknown) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function hasUsableStreetNumber(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) return false;

  const normalized = normalizeComparableText(raw);
  if (!normalized) return false;

  const invalidMarkers = new Set([
    "sn",
    "snn",
    "semnumero",
    "naoinformado",
    "naoidentificado",
    "nao",
    "ni",
    "ninf",
    "na",
    "n",
    "zero",
  ]);

  if (invalidMarkers.has(normalized)) return false;
  if (/^0+$/.test(normalized)) return false;

  return /\d/.test(normalized);
}

function toFiniteCoordinate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) return null;
  return value;
}

function buildRegionLabel(parts: { neighborhood?: string; city?: string; state?: string }) {
  const neighborhood = normalizeText(parts.neighborhood);
  const city = normalizeText(parts.city);
  const state = normalizeText(parts.state);
  if (neighborhood && city && state) return `${neighborhood}, ${city}/${state}`;
  if (city && state) return `${city}/${state}`;
  if (city) return city;
  if (state) return state;
  return "região informada";
}

function getDefaultMapPresentation(accuracy: PropertyLocationAccuracy): PropertyMapPresentation {
  if (accuracy === "exact" || accuracy === "street") return "pin";
  if (accuracy === "neighborhood") return "circle";
  return "hidden";
}

function getDefaultMapRadiusMeters(accuracy: PropertyLocationAccuracy): number | null {
  if (accuracy === "neighborhood") return 1200;
  return null;
}

function buildResolution(args: {
  lat: number | null;
  lng: number | null;
  accuracy: PropertyLocationAccuracy;
  source: PropertyLocationSource;
  regionLabel: string;
  query?: string | null;
}): PropertyLocationResolution {
  const { lat, lng, accuracy, source, regionLabel, query = null } = args;

  if (accuracy === "exact") {
    return {
      lat,
      lng,
      accuracy,
      source,
      displayLabel: regionLabel,
      badgeLabel: "Endereço confirmado",
      precisionNote: "Mapa e arredores com base na posição registrada deste imóvel.",
      mapEmptyMessage: "Não foi possível posicionar o mapa deste anúncio agora.",
      poiTitle: "Serviços e conveniências por perto",
      poiEmptyMessage: "Não encontramos estabelecimentos relevantes nos arredores imediatos.",
      nearbyMode: "distance",
      nearbyTitle: "Imóveis próximos",
      nearbyDescription: "Selecionamos anúncios pela proximidade geográfica real deste endereço.",
      nearbyEmptyMessage: "Quando houver anúncios realmente próximos, eles aparecerão aqui.",
      similarTitle: "Imóveis similares",
      canShowMap: true,
      canShowPois: true,
      canShowNearby: true,
      canShowDistanceLabels: true,
      isApproximate: false,
      mapPresentation: getDefaultMapPresentation(accuracy),
      mapRadiusMeters: getDefaultMapRadiusMeters(accuracy),
      zoom: 15,
      query,
    };
  }

  if (accuracy === "street") {
    return {
      lat,
      lng,
      accuracy,
      source,
      displayLabel: regionLabel,
      badgeLabel: "Endereço estimado",
      precisionNote: "Usamos o endereço informado no anúncio para estimar esta área com boa aproximação.",
      mapEmptyMessage: "Não foi possível estimar o endereço deste anúncio agora.",
      poiTitle: "Serviços e conveniências por perto",
      poiEmptyMessage: "Não encontramos estabelecimentos próximos ao endereço estimado.",
      nearbyMode: "distance",
      nearbyTitle: "Imóveis próximos",
      nearbyDescription: "Selecionamos anúncios próximos ao endereço estimado deste imóvel.",
      nearbyEmptyMessage: "Quando houver imóveis próximos a este endereço, eles aparecerão aqui.",
      similarTitle: "Imóveis similares",
      canShowMap: true,
      canShowPois: true,
      canShowNearby: true,
      canShowDistanceLabels: true,
      isApproximate: true,
      mapPresentation: getDefaultMapPresentation(accuracy),
      mapRadiusMeters: getDefaultMapRadiusMeters(accuracy),
      zoom: 14,
      query,
    };
  }

  if (accuracy === "neighborhood") {
    return {
      lat,
      lng,
      accuracy,
      source,
      displayLabel: regionLabel,
      badgeLabel: "Bairro de referência",
      precisionNote: "Usamos o bairro informado no anúncio para apresentar uma leitura mais ampla da região.",
      mapEmptyMessage: "Não foi possível estimar o bairro informado neste anúncio agora.",
      poiTitle: "Pontos de interesse na região",
      poiEmptyMessage: "Não encontramos pontos de interesse relevantes para esta região agora.",
      nearbyMode: "region",
      nearbyTitle: "Outros imóveis nesta região",
      nearbyDescription: "Selecionamos anúncios do mesmo bairro ou entorno, sem prometer distância exata.",
      nearbyEmptyMessage: "Quando houver outros anúncios nesta região, eles aparecerão aqui.",
      similarTitle: "Imóveis similares na mesma cidade",
      canShowMap: lat != null && lng != null,
      canShowPois: lat != null && lng != null,
      canShowNearby: true,
      canShowDistanceLabels: false,
      isApproximate: true,
      mapPresentation: getDefaultMapPresentation(accuracy),
      mapRadiusMeters: getDefaultMapRadiusMeters(accuracy),
      zoom: 13,
      query,
    };
  }

  if (accuracy === "city") {
    return {
      lat,
      lng,
      accuracy,
      source,
      displayLabel: regionLabel,
      badgeLabel: "Cidade informada",
      precisionNote: "Este anúncio informa apenas a cidade, sem detalhes suficientes para abrir um recorte local confiável.",
      mapEmptyMessage: "A localização deste anúncio ainda está ampla demais para mostrar o mapa com segurança.",
      poiTitle: "Estabelecimentos",
      poiEmptyMessage: "Sem uma referência mais específica, não exibimos estabelecimentos nesta seção.",
      nearbyMode: "disabled",
      nearbyTitle: "Imóveis próximos",
      nearbyDescription: "Quando só a cidade está disponível, priorizamos apenas imóveis semelhantes ao perfil deste anúncio.",
      nearbyEmptyMessage: "Não exibimos imóveis próximos sem uma região mais precisa.",
      similarTitle: "Imóveis similares na cidade",
      canShowMap: false,
      canShowPois: false,
      canShowNearby: false,
      canShowDistanceLabels: false,
      isApproximate: true,
      mapPresentation: getDefaultMapPresentation(accuracy),
      mapRadiusMeters: getDefaultMapRadiusMeters(accuracy),
      zoom: 11,
      query,
    };
  }

  return {
    lat,
    lng,
    accuracy,
    source,
    displayLabel: regionLabel,
    badgeLabel: "Localização indisponível",
    precisionNote: "Este anúncio ainda não possui dados suficientes para apresentar a região com segurança.",
    mapEmptyMessage: "Este anúncio ainda não possui dados suficientes para mostrar a região no mapa.",
    poiTitle: "Estabelecimentos",
    poiEmptyMessage: "Sem dados suficientes, não exibimos estabelecimentos nesta seção.",
    nearbyMode: "disabled",
    nearbyTitle: "Imóveis próximos",
    nearbyDescription: "Enquanto faltam dados de localização, mostramos apenas imóveis com perfil semelhante.",
    nearbyEmptyMessage: "Não exibimos imóveis próximos sem uma referência de localização confiável.",
    similarTitle: "Imóveis similares",
    canShowMap: false,
    canShowPois: false,
    canShowNearby: false,
    canShowDistanceLabels: false,
    isApproximate: false,
    mapPresentation: getDefaultMapPresentation(accuracy),
    mapRadiusMeters: getDefaultMapRadiusMeters(accuracy),
    zoom: 11,
    query,
  };
}

function applyPublicLocationPolicy(
  input: PropertyLocationInput,
  resolution: PropertyLocationResolution
): PropertyLocationResolution {
  const hasStreetNumber = hasUsableStreetNumber(input.streetNumber);
  const shouldApproximate = !!input.hideExactAddress || !hasStreetNumber;

  if (!shouldApproximate) {
    return resolution;
  }

  if (!resolution.canShowMap || resolution.lat == null || resolution.lng == null) {
    return {
      ...resolution,
      mapPresentation: "hidden",
      mapRadiusMeters: null,
      canShowDistanceLabels: false,
    };
  }

  if (resolution.accuracy === "street" || resolution.accuracy === "exact") {
    return {
      ...resolution,
      badgeLabel: "Localização aproximada",
      precisionNote: "Mostramos uma área aproximada para não sugerir o ponto exato deste imóvel.",
      mapPresentation: "circle",
      mapRadiusMeters: 280,
      canShowDistanceLabels: false,
      isApproximate: true,
    };
  }

  if (resolution.accuracy === "neighborhood") {
    return {
      ...resolution,
      badgeLabel: "Localização aproximada",
      precisionNote: "Mostramos uma área aproximada nesta região para não sugerir o ponto exato deste imóvel.",
      mapPresentation: "circle",
      mapRadiusMeters: resolution.mapRadiusMeters ?? 1200,
      canShowDistanceLabels: false,
      isApproximate: true,
    };
  }

  return {
    ...resolution,
    mapPresentation: "hidden",
    mapRadiusMeters: null,
    canShowDistanceLabels: false,
  };
}

export function getPropertyLocationSnapshot(input: PropertyLocationInput): PropertyLocationResolution {
  const lat = toFiniteCoordinate(input.latitude);
  const lng = toFiniteCoordinate(input.longitude);
  const regionLabel = buildRegionLabel({
    neighborhood: input.neighborhood || undefined,
    city: input.city || undefined,
    state: input.state || undefined,
  });

  if (lat != null && lng != null) {
    return buildResolution({ lat, lng, accuracy: "exact", source: "stored", regionLabel });
  }

  if (normalizeText(input.neighborhood) && normalizeText(input.city) && normalizeText(input.state)) {
    return buildResolution({ lat: null, lng: null, accuracy: "neighborhood", source: "fallback", regionLabel });
  }

  if (normalizeText(input.city) && normalizeText(input.state)) {
    return buildResolution({ lat: null, lng: null, accuracy: "city", source: "fallback", regionLabel });
  }

  return buildResolution({ lat: null, lng: null, accuracy: "none", source: "none", regionLabel });
}

export async function resolvePropertyLocation(
  input: PropertyLocationInput,
  options?: { allowStreetPrecision?: boolean }
): Promise<PropertyLocationResolution> {
  const snapshot = getPropertyLocationSnapshot(input);
  if (snapshot.accuracy === "exact") {
    return snapshot;
  }

  const allowStreetPrecision = options?.allowStreetPrecision ?? !input.hideExactAddress;
  const street = allowStreetPrecision ? normalizeText(input.street) : "";
  const streetNumber = allowStreetPrecision ? normalizeText(input.streetNumber) : "";
  const neighborhood = normalizeText(input.neighborhood);
  const city = normalizeText(input.city);
  const state = normalizeText(input.state);
  const postalCode = allowStreetPrecision ? normalizeText(input.postalCode) : "";
  const country = normalizeText(input.country) || "Brazil";
  const regionLabel = buildRegionLabel({ neighborhood, city, state });
  const cacheKey = JSON.stringify({
    id: input.id || "",
    street,
    streetNumber,
    neighborhood,
    city,
    state,
    postalCode,
    country,
    allowStreetPrecision,
  });
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.t < CACHE_TTL_MS) {
    return cached.v;
  }

  let resolved = snapshot;

  if (street && city && state) {
    const result = await geocodeAddressParts({
      street,
      number: streetNumber,
      neighborhood,
      city,
      state,
      postalCode,
      country,
    }).catch(() => null);

    if (result) {
      resolved = buildResolution({
        lat: result.lat,
        lng: result.lng,
        accuracy: "street",
        source: "geocoded",
        regionLabel,
        query: result.displayName,
      });
      cache.set(cacheKey, { t: now, v: resolved });
      return resolved;
    }
  }

  if (neighborhood && city && state) {
    const result = await geocodeAddressParts({
      neighborhood,
      city,
      state,
      country,
    }).catch(() => null);

    if (result) {
      resolved = buildResolution({
        lat: result.lat,
        lng: result.lng,
        accuracy: "neighborhood",
        source: "geocoded",
        regionLabel,
        query: result.displayName,
      });
      cache.set(cacheKey, { t: now, v: resolved });
      return resolved;
    }
  }

  if (city && state) {
    const result = await geocodeAddressParts({
      city,
      state,
      country,
    }).catch(() => null);

    if (result) {
      resolved = buildResolution({
        lat: result.lat,
        lng: result.lng,
        accuracy: "city",
        source: "geocoded",
        regionLabel,
        query: result.displayName,
      });
      cache.set(cacheKey, { t: now, v: resolved });
      return resolved;
    }
  }

  cache.set(cacheKey, { t: now, v: resolved });
  return resolved;
}

export async function resolvePublicPropertyLocation(input: PropertyLocationInput): Promise<PropertyLocationResolution> {
  const hasStreetNumber = hasUsableStreetNumber(input.streetNumber);
  const sanitizedInput = input.hideExactAddress || !hasStreetNumber
    ? {
        ...input,
        latitude: null,
        longitude: null,
        streetNumber: hasStreetNumber ? input.streetNumber : null,
      }
    : input;
  const allowStreetPrecision = !input.hideExactAddress;
  const resolution = await resolvePropertyLocation(sanitizedInput, { allowStreetPrecision });
  return applyPublicLocationPolicy(input, resolution);
}
