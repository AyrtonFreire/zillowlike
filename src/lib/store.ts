// Dev-only in-memory store for auth-bound data
// In a real app, replace with a database.

const favoritesMap = new Map<string, Set<string>>();
const searchesMap = new Map<string, Array<{ label: string; params: string; ts: number }>>();

export function getFavorites(userId: string): string[] {
  return Array.from(favoritesMap.get(userId) || []);
}
export function toggleFavorite(userId: string, propertyId: string): boolean {
  let set = favoritesMap.get(userId);
  if (!set) { set = new Set(); favoritesMap.set(userId, set); }
  if (set.has(propertyId)) { set.delete(propertyId); return false; }
  set.add(propertyId); return true;
}

export function getSavedSearches(userId: string) {
  return searchesMap.get(userId) || [];
}
export function addSavedSearch(userId: string, label: string, params: string) {
  const arr = searchesMap.get(userId) || [];
  arr.unshift({ label, params, ts: Date.now() });
  searchesMap.set(userId, arr.slice(0, 50));
}
export function removeSavedSearch(userId: string, ts: number) {
  const arr = searchesMap.get(userId) || [];
  searchesMap.set(userId, arr.filter((s) => s.ts !== ts));
}
