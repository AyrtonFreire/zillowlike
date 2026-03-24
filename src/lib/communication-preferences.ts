import { z } from "zod";
import { buildSearchParams, parseFiltersFromSearchParams, type Filters } from "@/lib/url";

export const EMAIL_INTERESTS = ["BUY", "RENT", "ANNOUNCE", "INVEST"] as const;
export const EMAIL_FREQUENCIES = ["INSTANT", "DAILY", "WEEKLY"] as const;
export const EMAIL_SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "UNSUBSCRIBED"] as const;

export type EmailInterest = (typeof EMAIL_INTERESTS)[number];
export type EmailFrequency = (typeof EMAIL_FREQUENCIES)[number];
export type EmailSubscriptionStatus = (typeof EMAIL_SUBSCRIPTION_STATUSES)[number];

export const EMAIL_INTEREST_LABELS: Record<EmailInterest, string> = {
  BUY: "Comprar",
  RENT: "Alugar",
  ANNOUNCE: "Anunciar",
  INVEST: "Investir",
};

export const EMAIL_FREQUENCY_LABELS: Record<EmailFrequency, string> = {
  INSTANT: "Instantâneo",
  DAILY: "Diário",
  WEEKLY: "Semanal",
};

const emailInterestEnum = z.enum(EMAIL_INTERESTS);
const emailFrequencyEnum = z.enum(EMAIL_FREQUENCIES);
const emailSubscriptionStatusEnum = z.enum(EMAIL_SUBSCRIPTION_STATUSES);

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      const normalized = String(value || "").trim();
      return normalized ? normalized : undefined;
    });

export const PublicEmailSubscriptionSchema = z.object({
  email: z.string().trim().email().max(200),
  interests: z.array(emailInterestEnum).min(1).max(EMAIL_INTERESTS.length),
  city: optionalText(120),
  state: optionalText(10),
  frequency: emailFrequencyEnum.default("WEEKLY"),
  subscribedToAlerts: z.boolean().optional().default(true),
  subscribedToDigest: z.boolean().optional().default(true),
  subscribedToGuides: z.boolean().optional().default(true),
  subscribedToPriceDrops: z.boolean().optional().default(false),
  source: z.string().trim().max(40).optional().default("FOOTER"),
});

export const EmailPreferenceUpdateSchema = z.object({
  interests: z.array(emailInterestEnum).min(1).max(EMAIL_INTERESTS.length).optional(),
  city: optionalText(120),
  state: optionalText(10),
  frequency: emailFrequencyEnum.optional(),
  subscribedToAlerts: z.boolean().optional(),
  subscribedToDigest: z.boolean().optional(),
  subscribedToGuides: z.boolean().optional(),
  subscribedToPriceDrops: z.boolean().optional(),
  status: emailSubscriptionStatusEnum.optional(),
});

export function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeInterests(interests: readonly string[] | undefined | null): EmailInterest[] {
  const normalized = Array.from(
    new Set(
      (interests || [])
        .map((interest) => String(interest || "").trim().toUpperCase())
        .filter((interest): interest is EmailInterest => EMAIL_INTERESTS.includes(interest as EmailInterest))
    )
  );

  return normalized as EmailInterest[];
}

export function normalizeSavedSearchParams(raw: string | null | undefined) {
  const source = String(raw || "").trim();
  if (!source) {
    return { queryString: "", filters: {} as Filters };
  }

  if (source.startsWith("{")) {
    try {
      const parsed = JSON.parse(source) as Record<string, unknown>;
      const normalizedLegacy: Filters = {
        city: typeof parsed.city === "string" ? parsed.city : undefined,
        state: typeof parsed.state === "string" ? parsed.state : undefined,
        type: typeof parsed.type === "string" ? parsed.type : undefined,
        inCondominium: parsed.inCondominium ? String(parsed.inCondominium) : undefined,
        purpose: typeof parsed.purpose === "string" ? parsed.purpose : undefined,
        q: typeof parsed.q === "string" ? parsed.q : undefined,
        minPrice: typeof parsed.minPrice === "number" ? String(Math.round(Number(parsed.minPrice) / 100)) : typeof parsed.minPrice === "string" ? String(Math.round(Number(parsed.minPrice) / 100)) : undefined,
        maxPrice: typeof parsed.maxPrice === "number" ? String(Math.round(Number(parsed.maxPrice) / 100)) : typeof parsed.maxPrice === "string" ? String(Math.round(Number(parsed.maxPrice) / 100)) : undefined,
        bedroomsMin: typeof parsed.bedroomsMin !== "undefined" ? String(parsed.bedroomsMin) : typeof parsed.minBedrooms !== "undefined" ? String(parsed.minBedrooms) : undefined,
        bathroomsMin: typeof parsed.bathroomsMin !== "undefined" ? String(parsed.bathroomsMin) : typeof parsed.minBathrooms !== "undefined" ? String(parsed.minBathrooms) : undefined,
        areaMin: typeof parsed.areaMin !== "undefined" ? String(parsed.areaMin) : typeof parsed.minArea !== "undefined" ? String(parsed.minArea) : undefined,
      };
      const queryString = buildSearchParams(normalizedLegacy);
      return {
        queryString,
        filters: parseFiltersFromSearchParams(new URLSearchParams(queryString)),
      };
    } catch {
      return { queryString: "", filters: {} as Filters };
    }
  }

  const queryString = source.replace(/^\?/, "");
  return {
    queryString,
    filters: parseFiltersFromSearchParams(new URLSearchParams(queryString)),
  };
}

export function getSavedSearchFrequency(rawFrequency: string | null | undefined, rawParams: string | null | undefined): EmailFrequency {
  const candidate = String(rawFrequency || "").trim().toUpperCase();
  if (EMAIL_FREQUENCIES.includes(candidate as EmailFrequency)) {
    return candidate as EmailFrequency;
  }

  const source = String(rawParams || "").trim();
  if (source.startsWith("{")) {
    try {
      const parsed = JSON.parse(source) as { frequency?: string };
      const frequency = String(parsed?.frequency || "").trim().toUpperCase();
      if (EMAIL_FREQUENCIES.includes(frequency as EmailFrequency)) {
        return frequency as EmailFrequency;
      }
    } catch {
      return "DAILY";
    }
  }

  const searchParams = new URLSearchParams(source.replace(/^\?/, ""));
  const frequency = String(searchParams.get("frequency") || "").trim().toUpperCase();
  if (EMAIL_FREQUENCIES.includes(frequency as EmailFrequency)) {
    return frequency as EmailFrequency;
  }

  return "DAILY";
}

export function getEmailFrequencyLabel(frequency: string | null | undefined) {
  const normalized = String(frequency || "").trim().toUpperCase() as EmailFrequency;
  return EMAIL_FREQUENCY_LABELS[normalized] || EMAIL_FREQUENCY_LABELS.WEEKLY;
}

export function getEmailInterestLabel(interest: string | null | undefined) {
  const normalized = String(interest || "").trim().toUpperCase() as EmailInterest;
  return EMAIL_INTEREST_LABELS[normalized] || "Interesse";
}

export function getSiteBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3001";

  return String(base).replace(/\/$/, "");
}

export function shouldRunForFrequency(frequency: EmailFrequency, lastSentAt: Date | null | undefined, now = new Date()) {
  if (!lastSentAt) return true;

  const diffMs = now.getTime() - new Date(lastSentAt).getTime();
  if (frequency === "INSTANT") return true;
  if (frequency === "DAILY") return diffMs >= 24 * 60 * 60 * 1000;
  return diffMs >= 7 * 24 * 60 * 60 * 1000;
}
