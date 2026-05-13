/**
 * Deriva uma cor accent estável a partir do slug do corretor.
 * Mesmo slug = mesma paleta sempre. Sem schema change.
 */

export type RealtorAccent = {
  /** Gradient para banner/capa */
  bannerClass: string;
  /** Ring (anel) ao redor do avatar */
  ringClass: string;
  /** Cor base usada em focos/links accent */
  textClass: string;
  /** Nome semântico da paleta (debug) */
  name: string;
};

const PALETTES: RealtorAccent[] = [
  {
    name: "teal-emerald",
    bannerClass: "bg-gradient-to-br from-teal-300/70 via-emerald-300/60 to-sky-300/60",
    ringClass: "ring-teal-200",
    textClass: "text-teal-700",
  },
  {
    name: "sky-blue",
    bannerClass: "bg-gradient-to-br from-sky-300/70 via-blue-300/60 to-indigo-300/55",
    ringClass: "ring-sky-200",
    textClass: "text-sky-700",
  },
  {
    name: "violet-purple",
    bannerClass: "bg-gradient-to-br from-violet-300/65 via-purple-300/55 to-fuchsia-300/55",
    ringClass: "ring-violet-200",
    textClass: "text-violet-700",
  },
  {
    name: "amber-rose",
    bannerClass: "bg-gradient-to-br from-amber-300/65 via-orange-300/55 to-rose-300/55",
    ringClass: "ring-amber-200",
    textClass: "text-amber-700",
  },
  {
    name: "slate-graphite",
    bannerClass: "bg-gradient-to-br from-slate-300/70 via-zinc-300/60 to-gray-300/60",
    ringClass: "ring-slate-200",
    textClass: "text-slate-700",
  },
];

function hashString(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getRealtorAccent(seed: string | null | undefined): RealtorAccent {
  const safe = String(seed || "").trim() || "default";
  const idx = hashString(safe) % PALETTES.length;
  return PALETTES[idx];
}
