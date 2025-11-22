export type Filters = {
  city?: string;
  state?: string;
  type?: string;
  q?: string;
  minPrice?: string; // reais (inteiro em string)
  maxPrice?: string; // reais (inteiro em string)
  bedroomsMin?: string;
  bathroomsMin?: string;
  areaMin?: string;
  sort?: string; // recent | price_asc | price_desc
  page?: number;
  pageSize?: number;
  // map bounds
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  // Advanced filters
  parkingSpots?: string;
  yearBuiltMin?: string;
  yearBuiltMax?: string;
  purpose?: string;
  petFriendly?: string; // "true" | "false"
  furnished?: string;
  hasPool?: string;
  hasGym?: string;
  hasElevator?: string;
  hasBalcony?: string;
  // Novos filtros de amenidades
  hasPlayground?: string;
  hasPartyRoom?: string;
  hasGourmet?: string;
  hasConcierge24h?: string;
  comfortAC?: string;
  comfortHeating?: string;
  comfortSolar?: string;
  comfortNoiseWindows?: string;
  comfortLED?: string;
  comfortWaterReuse?: string;
  accRamps?: string;
  accWideDoors?: string;
  accAccessibleElevator?: string;
  accTactile?: string;
  finishCabinets?: string;
  finishCounterGranite?: string;
  finishCounterQuartz?: string;
  viewSea?: string;
  viewCity?: string;
  positionFront?: string;
  positionBack?: string;
  petsSmall?: string;
  petsLarge?: string;
  condoFeeMin?: string;
  condoFeeMax?: string;
  iptuMin?: string;
  iptuMax?: string;
  keywords?: string;
};

export function parseFiltersFromSearchParams(sp: URLSearchParams): Filters {
  const f: Filters = {};
  const get = (k: string) => sp.get(k) || undefined;
  f.city = get("city");
  f.state = get("state");
  f.type = get("type");
  f.q = get("q");
  const min0 = get("minPrice");
  const max0 = get("maxPrice");
  // no UI: guardar em reais (não centavos)
  if (min0) f.minPrice = min0;
  if (max0) f.maxPrice = max0;
  f.bedroomsMin = get("bedroomsMin");
  f.bathroomsMin = get("bathroomsMin");
  f.areaMin = get("areaMin");
  f.sort = get("sort") || "recent";
  const page = Number(get("page") || 1);
  if (page && page > 1) f.page = page;
  const ps = Number(get("pageSize") || 0);
  if (ps) f.pageSize = ps;
  const minLat = get("minLat"), maxLat = get("maxLat"), minLng = get("minLng"), maxLng = get("maxLng");
  if (minLat && maxLat && minLng && maxLng) {
    f.minLat = Number(minLat);
    f.maxLat = Number(maxLat);
    f.minLng = Number(minLng);
    f.maxLng = Number(maxLng);
  }
  // Advanced filters
  f.parkingSpots = get("parkingSpots");
  f.yearBuiltMin = get("yearBuiltMin");
  f.yearBuiltMax = get("yearBuiltMax");
  f.purpose = get("purpose");
  f.petFriendly = get("petFriendly");
  f.furnished = get("furnished");
  f.hasPool = get("hasPool");
  f.hasGym = get("hasGym");
  f.hasElevator = get("hasElevator");
  f.hasBalcony = get("hasBalcony");
  f.hasPlayground = get("hasPlayground");
  f.hasPartyRoom = get("hasPartyRoom");
  f.hasGourmet = get("hasGourmet");
  f.hasConcierge24h = get("hasConcierge24h");
  f.comfortAC = get("comfortAC");
  f.comfortHeating = get("comfortHeating");
  f.comfortSolar = get("comfortSolar");
  f.comfortNoiseWindows = get("comfortNoiseWindows");
  f.comfortLED = get("comfortLED");
  f.comfortWaterReuse = get("comfortWaterReuse");
  f.accRamps = get("accRamps");
  f.accWideDoors = get("accWideDoors");
  f.accAccessibleElevator = get("accAccessibleElevator");
  f.accTactile = get("accTactile");
  f.finishCabinets = get("finishCabinets");
  f.finishCounterGranite = get("finishCounterGranite");
  f.finishCounterQuartz = get("finishCounterQuartz");
  f.viewSea = get("viewSea");
  f.viewCity = get("viewCity");
  f.positionFront = get("positionFront");
  f.positionBack = get("positionBack");
  f.petsSmall = get("petsSmall");
  f.petsLarge = get("petsLarge");
  f.condoFeeMin = get("condoFeeMin");
  f.condoFeeMax = get("condoFeeMax");
  f.iptuMin = get("iptuMin");
  f.iptuMax = get("iptuMax");
  f.keywords = get("keywords");
  return f;
}

export function buildSearchParams(filters: Filters): string {
  const p = new URLSearchParams();
  if (filters.city) p.set("city", filters.city);
  if (filters.state) p.set("state", filters.state);
  if (filters.type) p.set("type", filters.type);
  if (filters.minPrice) p.set("minPrice", String(Number(filters.minPrice)));
  if (filters.maxPrice) p.set("maxPrice", String(Number(filters.maxPrice)));
  if (filters.q) p.set("q", filters.q);
  if (filters.bedroomsMin) p.set("bedroomsMin", String(Number(filters.bedroomsMin)));
  if (filters.bathroomsMin) p.set("bathroomsMin", String(Number(filters.bathroomsMin)));
  if (filters.areaMin) p.set("areaMin", String(Number(filters.areaMin)));
  if (filters.sort && filters.sort !== "recent") p.set("sort", filters.sort);
  if (filters.page && filters.page > 1) p.set("page", String(filters.page));
  if (filters.pageSize) p.set("pageSize", String(filters.pageSize));
  if (
    typeof filters.minLat === 'number' && typeof filters.maxLat === 'number' &&
    typeof filters.minLng === 'number' && typeof filters.maxLng === 'number'
  ) {
    p.set("minLat", String(filters.minLat));
    p.set("maxLat", String(filters.maxLat));
    p.set("minLng", String(filters.minLng));
    p.set("maxLng", String(filters.maxLng));
  }
  // Advanced filters
  if (filters.parkingSpots) p.set("parkingSpots", filters.parkingSpots);
  if (filters.yearBuiltMin) p.set("yearBuiltMin", filters.yearBuiltMin);
  if (filters.yearBuiltMax) p.set("yearBuiltMax", filters.yearBuiltMax);
  if (filters.purpose) p.set("purpose", filters.purpose);
  if (filters.petFriendly) p.set("petFriendly", filters.petFriendly);
  if (filters.furnished) p.set("furnished", filters.furnished);
  if (filters.hasPool) p.set("hasPool", filters.hasPool);
  if (filters.hasGym) p.set("hasGym", filters.hasGym);
  if (filters.hasElevator) p.set("hasElevator", filters.hasElevator);
  if (filters.hasBalcony) p.set("hasBalcony", filters.hasBalcony);
  if (filters.hasPlayground) p.set("hasPlayground", filters.hasPlayground);
  if (filters.hasPartyRoom) p.set("hasPartyRoom", filters.hasPartyRoom);
  if (filters.hasGourmet) p.set("hasGourmet", filters.hasGourmet);
  if (filters.hasConcierge24h) p.set("hasConcierge24h", filters.hasConcierge24h);
  if (filters.comfortAC) p.set("comfortAC", filters.comfortAC);
  if (filters.comfortHeating) p.set("comfortHeating", filters.comfortHeating);
  if (filters.comfortSolar) p.set("comfortSolar", filters.comfortSolar);
  if (filters.comfortNoiseWindows) p.set("comfortNoiseWindows", filters.comfortNoiseWindows);
  if (filters.comfortLED) p.set("comfortLED", filters.comfortLED);
  if (filters.comfortWaterReuse) p.set("comfortWaterReuse", filters.comfortWaterReuse);
  if (filters.accRamps) p.set("accRamps", filters.accRamps);
  if (filters.accWideDoors) p.set("accWideDoors", filters.accWideDoors);
  if (filters.accAccessibleElevator) p.set("accAccessibleElevator", filters.accAccessibleElevator);
  if (filters.accTactile) p.set("accTactile", filters.accTactile);
  if (filters.finishCabinets) p.set("finishCabinets", filters.finishCabinets);
  if (filters.finishCounterGranite) p.set("finishCounterGranite", filters.finishCounterGranite);
  if (filters.finishCounterQuartz) p.set("finishCounterQuartz", filters.finishCounterQuartz);
  if (filters.viewSea) p.set("viewSea", filters.viewSea);
  if (filters.viewCity) p.set("viewCity", filters.viewCity);
  if (filters.positionFront) p.set("positionFront", filters.positionFront);
  if (filters.positionBack) p.set("positionBack", filters.positionBack);
  if (filters.petsSmall) p.set("petsSmall", filters.petsSmall);
  if (filters.petsLarge) p.set("petsLarge", filters.petsLarge);
  if (filters.condoFeeMin) p.set("condoFeeMin", filters.condoFeeMin);
  if (filters.condoFeeMax) p.set("condoFeeMax", filters.condoFeeMax);
  if (filters.iptuMin) p.set("iptuMin", filters.iptuMin);
  if (filters.iptuMax) p.set("iptuMax", filters.iptuMax);
  if (filters.keywords) p.set("keywords", filters.keywords);
  return p.toString();
}
