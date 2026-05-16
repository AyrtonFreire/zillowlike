/**
 * Public profile view-model derivations.
 *
 * Pure functions that turn raw model values (already loaded from the DB) into
 * the shapes the public profile page actually renders: trust badges, hero
 * stats, price range, mixes, neighborhood ranks, rating distribution, etc.
 *
 * No Prisma / I/O here — keep these testable in isolation.
 */

// ---------------------------------------------------------------------------
// Badge catalog
// ---------------------------------------------------------------------------

export const BADGE_THRESHOLDS = {
  fastResponderMaxMinutes: 30,
  sameDayResponderMaxMinutes: 240,
  responderMinLeads: 10,
  topProducerMinDeals: 50,
  topProducerMinQueueAccepted: 100,
  risingStarMinDeals: 10,
  risingStarMaxExperience: 2,
  yearsActiveMinExperience: 3,
  wideInventoryMinProperties: 20,
  manyAreasMinAreas: 3,
  wellReviewedMinRatings: 5,
  wellReviewedMinAvg: 4.5,
  recentlyActiveMaxDays: 7,
  engagesReviewsMinRate: 0.5,
  engagesReviewsMinSample: 4,
  agencyTeamMinMembers: 2,
} as const;

export type TrustBadgeKey =
  | "creciVerified"
  | "phoneVerified"
  | "fastResponder"
  | "sameDayResponder"
  | "topProducer"
  | "risingStar"
  | "yearsActive"
  | "wideInventory"
  | "manyAreas"
  | "wellReviewed"
  | "recentlyActive"
  | "engagesReviews"
  | "agencyTeam";

export type TrustBadgeTone = "trust" | "performance" | "scale" | "activity";

export type TrustBadgeVM = {
  key: TrustBadgeKey;
  label: string;
  tooltip: string;
  tone: TrustBadgeTone;
  weight: number; // higher = higher priority in the ribbon
};

// ---------------------------------------------------------------------------
// Stats / hero
// ---------------------------------------------------------------------------

export type SignatureStatKey =
  | "rating"
  | "activeListings"
  | "responseTime"
  | "experience"
  | "completedDeals"
  | "yearsInBusiness";

export type SignatureStatVM = {
  key: SignatureStatKey;
  label: string;
  value: string;
  helper?: string;
};

// ---------------------------------------------------------------------------
// Inventory aggregates
// ---------------------------------------------------------------------------

export type PriceRangeVM = {
  minCents: number;
  maxCents: number;
  label: string;
};

export type PropertyMixEntry = { type: string; count: number };
export type PurposeMixVM = { buy: number; rent: number; other: number };
export type NeighborhoodEntry = { name: string; count: number };

// ---------------------------------------------------------------------------
// Ratings aggregates
// ---------------------------------------------------------------------------

export type RatingDistribution = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type ExperienceBucket = "novato" | "experiente" | "veterano";

// ---------------------------------------------------------------------------
// Badge derivation
// ---------------------------------------------------------------------------

export type BadgeComputeInput = {
  isAgency: boolean;
  creci: string | null;
  creciState: string | null;
  creciExpiry: Date | null;
  phoneVerified: boolean;
  publicPhoneOptIn: boolean;
  avgResponseTime: number | null; // minutes
  leadsAccepted: number;
  soldCount: number;
  rentedCount: number;
  queueTotalAccepted: number | null;
  experience: number | null;
  propertiesCount: number;
  serviceAreasCount: number;
  totalRatings: number;
  avgRating: number;
  lastActivity: Date | null;
  recentRatingsWithReply: number;
  recentRatingsTotal: number;
  agencyTeamSize: number | null;
  now?: Date;
};

const MONTHS_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function formatCreciExpiry(expiry: Date): string {
  return `${MONTHS_PT[expiry.getMonth()]}/${expiry.getFullYear()}`;
}

export function computeBadges(input: BadgeComputeInput): TrustBadgeVM[] {
  const now = input.now ?? new Date();
  const out: TrustBadgeVM[] = [];

  // CRECI verificado — só se houver número e validade futura.
  if (input.creci && input.creciExpiry && input.creciExpiry.getTime() > now.getTime()) {
    const creciLabel = input.creciState ? `${input.creci}/${input.creciState}` : input.creci;
    out.push({
      key: "creciVerified",
      label: "CRECI verificado",
      tooltip: `CRECI ${creciLabel}, válido até ${formatCreciExpiry(input.creciExpiry)}`,
      tone: "trust",
      weight: 100,
    });
  }

  // Telefone verificado e visível publicamente.
  if (input.phoneVerified && input.publicPhoneOptIn) {
    out.push({
      key: "phoneVerified",
      label: "Telefone verificado",
      tooltip: "Número confirmado por SMS",
      tone: "trust",
      weight: 90,
    });
  }

  // Resposta rápida vs no mesmo dia — exclusivos. Exige amostra mínima.
  if (
    input.avgResponseTime != null &&
    input.leadsAccepted >= BADGE_THRESHOLDS.responderMinLeads
  ) {
    if (input.avgResponseTime <= BADGE_THRESHOLDS.fastResponderMaxMinutes) {
      out.push({
        key: "fastResponder",
        label: "Resposta rápida",
        tooltip: `Responde em média em até ${BADGE_THRESHOLDS.fastResponderMaxMinutes}min em ${input.leadsAccepted}+ leads`,
        tone: "performance",
        weight: 70,
      });
    } else if (input.avgResponseTime <= BADGE_THRESHOLDS.sameDayResponderMaxMinutes) {
      out.push({
        key: "sameDayResponder",
        label: "Resposta no mesmo dia",
        tooltip: "Responde a leads em até 4 horas em média",
        tone: "performance",
        weight: 60,
      });
    }
  }

  // Top produtor vs Em ascensão — exclusivos.
  const closedDeals = (input.soldCount || 0) + (input.rentedCount || 0);
  const queueAccepted = input.queueTotalAccepted || 0;
  if (
    closedDeals >= BADGE_THRESHOLDS.topProducerMinDeals ||
    queueAccepted >= BADGE_THRESHOLDS.topProducerMinQueueAccepted
  ) {
    out.push({
      key: "topProducer",
      label: "Top produtor",
      tooltip: `Mais de ${BADGE_THRESHOLDS.topProducerMinDeals} transações concluídas`,
      tone: "performance",
      weight: 80,
    });
  } else if (
    closedDeals >= BADGE_THRESHOLDS.risingStarMinDeals &&
    input.experience != null &&
    input.experience <= BADGE_THRESHOLDS.risingStarMaxExperience
  ) {
    out.push({
      key: "risingStar",
      label: "Em ascensão",
      tooltip: "Profissional jovem com volume crescente",
      tone: "performance",
      weight: 65,
    });
  }

  // Anos de atuação (corretor individual).
  if (
    !input.isAgency &&
    input.experience != null &&
    input.experience >= BADGE_THRESHOLDS.yearsActiveMinExperience
  ) {
    out.push({
      key: "yearsActive",
      label: `${input.experience} anos de atuação`,
      tooltip: `${input.experience} anos como corretor`,
      tone: "scale",
      weight: 55,
    });
  }

  // Carteira ampla.
  if (input.propertiesCount >= BADGE_THRESHOLDS.wideInventoryMinProperties) {
    out.push({
      key: "wideInventory",
      label: `Carteira de ${input.propertiesCount} imóveis`,
      tooltip: `${input.propertiesCount} imóveis ativos`,
      tone: "scale",
      weight: 50,
    });
  }

  // Atende N bairros.
  if (input.serviceAreasCount >= BADGE_THRESHOLDS.manyAreasMinAreas) {
    out.push({
      key: "manyAreas",
      label: `Atende ${input.serviceAreasCount} regiões`,
      tooltip: `Atende ${input.serviceAreasCount} regiões`,
      tone: "scale",
      weight: 45,
    });
  }

  // Bem avaliado.
  if (
    input.totalRatings >= BADGE_THRESHOLDS.wellReviewedMinRatings &&
    input.avgRating >= BADGE_THRESHOLDS.wellReviewedMinAvg
  ) {
    out.push({
      key: "wellReviewed",
      label: `${input.avgRating.toFixed(1)}★ em ${input.totalRatings} avaliações`,
      tooltip: `${input.avgRating.toFixed(1)}★ em ${input.totalRatings} avaliações`,
      tone: "trust",
      weight: 75,
    });
  }

  // Ativo recentemente.
  if (input.lastActivity) {
    const days = computeLastActivityDays(input.lastActivity, now);
    if (days != null && days <= BADGE_THRESHOLDS.recentlyActiveMaxDays) {
      out.push({
        key: "recentlyActive",
        label: "Ativo recentemente",
        tooltip: "Atualizou imóveis ou respondeu leads há poucos dias",
        tone: "activity",
        weight: 40,
      });
    }
  }

  // Engaja com reviews.
  if (input.recentRatingsTotal >= BADGE_THRESHOLDS.engagesReviewsMinSample) {
    const rate = input.recentRatingsWithReply / input.recentRatingsTotal;
    if (rate >= BADGE_THRESHOLDS.engagesReviewsMinRate) {
      out.push({
        key: "engagesReviews",
        label: "Responde avaliações",
        tooltip: `Responde a ${Math.round(rate * 100)}% das avaliações`,
        tone: "trust",
        weight: 35,
      });
    }
  }

  // Imobiliária com N+ corretores.
  if (
    input.isAgency &&
    input.agencyTeamSize != null &&
    input.agencyTeamSize >= BADGE_THRESHOLDS.agencyTeamMinMembers
  ) {
    out.push({
      key: "agencyTeam",
      label: `${input.agencyTeamSize} corretores ativos`,
      tooltip: `Imobiliária com ${input.agencyTeamSize} corretores ativos`,
      tone: "scale",
      weight: 60,
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}

// ---------------------------------------------------------------------------
// Inventory derivers
// ---------------------------------------------------------------------------

function formatBRL(cents: number): string {
  // Input is stored in centavos (same convention as PortfolioPropertyTile),
  // so divide by 100 to get reais before bucketing.
  const reais = Math.round(cents / 100);
  if (reais >= 1_000_000) {
    const millions = reais / 1_000_000;
    const trimmed = millions >= 10 ? millions.toFixed(0) : millions.toFixed(1);
    return `R$ ${trimmed.replace(".", ",")}M`;
  }
  if (reais >= 1_000) {
    const thousands = Math.round(reais / 1_000);
    return `R$ ${thousands.toLocaleString("pt-BR")} mil`;
  }
  return `R$ ${reais.toLocaleString("pt-BR")}`;
}

export function computePriceRange(
  prices: ReadonlyArray<number | null | undefined>
): PriceRangeVM | null {
  const valid = prices.filter((p): p is number => typeof p === "number" && p > 0 && Number.isFinite(p));
  if (valid.length === 0) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const label = min === max ? formatBRL(min) : `${formatBRL(min)} – ${formatBRL(max)}`;
  return { minCents: min, maxCents: max, label };
}

export function computePropertyMix(
  types: ReadonlyArray<string | null | undefined>
): PropertyMixEntry[] {
  const counts = new Map<string, number>();
  for (const t of types) {
    if (!t) continue;
    const key = String(t).trim().toUpperCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function computePurposeMix(
  purposes: ReadonlyArray<string | null | undefined>
): PurposeMixVM {
  let buy = 0;
  let rent = 0;
  let other = 0;
  for (const p of purposes) {
    const v = (p ?? "").toString().trim().toUpperCase();
    if (v === "SALE" || v === "BUY" || v === "VENDA") buy++;
    else if (v === "RENT" || v === "ALUGUEL") rent++;
    else if (v) other++;
  }
  return { buy, rent, other };
}

export function computeTopNeighborhoods(
  neighborhoods: ReadonlyArray<string | null | undefined>,
  limit = 5
): NeighborhoodEntry[] {
  const counts = new Map<string, number>();
  for (const n of neighborhoods) {
    const v = (n ?? "").toString().trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Ratings derivers
// ---------------------------------------------------------------------------

export function computeRatingDistribution(
  ratings: ReadonlyArray<{ rating: number | null | undefined }>
): RatingDistribution {
  const acc: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    const v = Math.round(Number(r.rating ?? 0));
    if (v >= 1 && v <= 5) acc[v as 1 | 2 | 3 | 4 | 5]++;
  }
  return acc;
}

export function computeReviewReplyRate(
  ratings: ReadonlyArray<{ replyText: string | null | undefined }>
): number | null {
  if (ratings.length === 0) return null;
  const replied = ratings.filter((r) => {
    const v = (r.replyText ?? "").toString().trim();
    return v.length > 0;
  }).length;
  return replied / ratings.length;
}

// ---------------------------------------------------------------------------
// Misc derivers
// ---------------------------------------------------------------------------

export function computeLastActivityDays(
  lastActivity: Date | null | undefined,
  now?: Date
): number | null {
  if (!lastActivity) return null;
  const ref = now ?? new Date();
  const diffMs = ref.getTime() - lastActivity.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 86_400_000);
}

export function computeExperienceBucket(
  experience: number | null | undefined
): ExperienceBucket | null {
  if (experience == null || !Number.isFinite(experience)) return null;
  if (experience < 3) return "novato";
  if (experience < 10) return "experiente";
  return "veterano";
}

// ---------------------------------------------------------------------------
// Hero signature stats
// ---------------------------------------------------------------------------

export type SignatureStatsInput = {
  isAgency: boolean;
  avgRating: number;
  totalRatings: number;
  activeListings: number;
  avgResponseTime: number | null;
  experience: number | null;
  yearsInBusiness: number | null;
  soldCount: number;
  rentedCount: number;
};

function formatResponseTimeLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const minutes = Math.max(0, Math.round(Number(value)));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest.toString().padStart(2, "0")}m` : `${hours}h`;
}

export function computeSignatureStats(input: SignatureStatsInput): SignatureStatVM[] {
  const out: SignatureStatVM[] = [];

  if (input.totalRatings > 0 && input.avgRating > 0) {
    out.push({
      key: "rating",
      label: "Avaliação",
      value: input.avgRating.toFixed(1),
      helper: `${input.totalRatings} ${input.totalRatings === 1 ? "avaliação" : "avaliações"}`,
    });
  }

  if (input.activeListings > 0) {
    out.push({
      key: "activeListings",
      label: "Imóveis ativos",
      value: String(input.activeListings),
    });
  }

  if (input.avgResponseTime != null) {
    out.push({
      key: "responseTime",
      label: "Resposta média",
      value: formatResponseTimeLabel(input.avgResponseTime),
    });
  }

  const closedDeals = (input.soldCount || 0) + (input.rentedCount || 0);
  if (closedDeals > 0) {
    out.push({
      key: "completedDeals",
      label: "Negócios fechados",
      value: String(closedDeals),
    });
  }

  if (input.isAgency && input.yearsInBusiness != null && input.yearsInBusiness > 0) {
    out.push({
      key: "yearsInBusiness",
      label: "Anos de atuação",
      value: String(input.yearsInBusiness),
    });
  } else if (!input.isAgency && input.experience != null && input.experience > 0) {
    out.push({
      key: "experience",
      label: "Anos de experiência",
      value: String(input.experience),
    });
  }

  return out;
}
