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
  return p.toString();
}
