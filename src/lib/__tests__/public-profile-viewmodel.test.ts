import { describe, expect, it } from "vitest";
import {
  BADGE_THRESHOLDS,
  computeBadges,
  computeExperienceBucket,
  computeLastActivityDays,
  computePriceRange,
  computePropertyMix,
  computePurposeMix,
  computeRatingDistribution,
  computeReviewReplyRate,
  computeSignatureStats,
  computeTopNeighborhoods,
  type BadgeComputeInput,
  type TrustBadgeKey,
} from "../public-profile-viewmodel";

function baseInput(overrides: Partial<BadgeComputeInput> = {}): BadgeComputeInput {
  return {
    isAgency: false,
    creci: null,
    creciState: null,
    creciExpiry: null,
    phoneVerified: false,
    publicPhoneOptIn: false,
    avgResponseTime: null,
    leadsAccepted: 0,
    soldCount: 0,
    rentedCount: 0,
    queueTotalAccepted: null,
    experience: null,
    propertiesCount: 0,
    serviceAreasCount: 0,
    totalRatings: 0,
    avgRating: 0,
    lastActivity: null,
    recentRatingsWithReply: 0,
    recentRatingsTotal: 0,
    agencyTeamSize: null,
    now: new Date("2026-05-16T12:00:00Z"),
    ...overrides,
  };
}

function badgeKeys(input: BadgeComputeInput): TrustBadgeKey[] {
  return computeBadges(input).map((b) => b.key);
}

describe("computeBadges", () => {
  it("returns empty array when nothing qualifies", () => {
    expect(computeBadges(baseInput())).toEqual([]);
  });

  it("emits CRECI badge only when expiry is in the future", () => {
    const valid = baseInput({
      creci: "12345-F",
      creciState: "PE",
      creciExpiry: new Date("2026-12-31T00:00:00Z"),
    });
    expect(badgeKeys(valid)).toContain("creciVerified");

    const expired = baseInput({
      creci: "12345-F",
      creciState: "PE",
      creciExpiry: new Date("2026-01-01T00:00:00Z"),
    });
    expect(badgeKeys(expired)).not.toContain("creciVerified");
  });

  it("only emits phone badge when both verified and opted-in", () => {
    expect(badgeKeys(baseInput({ phoneVerified: true, publicPhoneOptIn: false }))).not.toContain(
      "phoneVerified"
    );
    expect(badgeKeys(baseInput({ phoneVerified: false, publicPhoneOptIn: true }))).not.toContain(
      "phoneVerified"
    );
    expect(badgeKeys(baseInput({ phoneVerified: true, publicPhoneOptIn: true }))).toContain(
      "phoneVerified"
    );
  });

  it("prefers fastResponder over sameDayResponder when both could apply", () => {
    const fast = baseInput({ avgResponseTime: 20, leadsAccepted: 25 });
    expect(badgeKeys(fast)).toContain("fastResponder");
    expect(badgeKeys(fast)).not.toContain("sameDayResponder");

    const sameDay = baseInput({ avgResponseTime: 120, leadsAccepted: 25 });
    expect(badgeKeys(sameDay)).toContain("sameDayResponder");
    expect(badgeKeys(sameDay)).not.toContain("fastResponder");
  });

  it("requires minimum leadsAccepted sample for responder badges", () => {
    const noSample = baseInput({ avgResponseTime: 10, leadsAccepted: 3 });
    expect(badgeKeys(noSample)).not.toContain("fastResponder");
    expect(badgeKeys(noSample)).not.toContain("sameDayResponder");
  });

  it("topProducer and risingStar are mutually exclusive (topProducer wins)", () => {
    const both = baseInput({
      soldCount: 60,
      rentedCount: 0,
      experience: 1,
    });
    const keys = badgeKeys(both);
    expect(keys).toContain("topProducer");
    expect(keys).not.toContain("risingStar");
  });

  it("topProducer triggers via queue.totalAccepted as well", () => {
    const queueOnly = baseInput({
      soldCount: 0,
      rentedCount: 0,
      queueTotalAccepted: BADGE_THRESHOLDS.topProducerMinQueueAccepted,
    });
    expect(badgeKeys(queueOnly)).toContain("topProducer");
  });

  it("hides yearsActive for agency variant", () => {
    const realtor = baseInput({ experience: 10 });
    const agency = baseInput({ isAgency: true, experience: 10 });
    expect(badgeKeys(realtor)).toContain("yearsActive");
    expect(badgeKeys(agency)).not.toContain("yearsActive");
  });

  it("wellReviewed requires both threshold and average", () => {
    const lowRating = baseInput({ totalRatings: 8, avgRating: 4.0 });
    const fewReviews = baseInput({ totalRatings: 3, avgRating: 5.0 });
    const qualifies = baseInput({ totalRatings: 8, avgRating: 4.8 });
    expect(badgeKeys(lowRating)).not.toContain("wellReviewed");
    expect(badgeKeys(fewReviews)).not.toContain("wellReviewed");
    expect(badgeKeys(qualifies)).toContain("wellReviewed");
  });

  it("recentlyActive uses lastActivity vs now", () => {
    const recent = baseInput({
      lastActivity: new Date("2026-05-14T12:00:00Z"), // 2 days before now
    });
    const stale = baseInput({
      lastActivity: new Date("2026-04-01T12:00:00Z"),
    });
    expect(badgeKeys(recent)).toContain("recentlyActive");
    expect(badgeKeys(stale)).not.toContain("recentlyActive");
  });

  it("engagesReviews requires minimum sample size", () => {
    const tiny = baseInput({ recentRatingsTotal: 2, recentRatingsWithReply: 2 });
    const sample = baseInput({ recentRatingsTotal: 10, recentRatingsWithReply: 7 });
    expect(badgeKeys(tiny)).not.toContain("engagesReviews");
    expect(badgeKeys(sample)).toContain("engagesReviews");
  });

  it("agencyTeam badge only emits for agency", () => {
    const realtor = baseInput({ agencyTeamSize: 8 });
    const agency = baseInput({ isAgency: true, agencyTeamSize: 8 });
    expect(badgeKeys(realtor)).not.toContain("agencyTeam");
    expect(badgeKeys(agency)).toContain("agencyTeam");
  });

  it("sorts badges by weight descending", () => {
    const result = computeBadges(
      baseInput({
        creci: "12345-F",
        creciState: "PE",
        creciExpiry: new Date("2030-01-01"),
        phoneVerified: true,
        publicPhoneOptIn: true,
        soldCount: 60,
        avgResponseTime: 15,
        leadsAccepted: 25,
      })
    );
    const weights = result.map((b) => b.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });
});

describe("computePriceRange", () => {
  it("returns null when no positive prices", () => {
    expect(computePriceRange([])).toBeNull();
    expect(computePriceRange([null, undefined, 0])).toBeNull();
  });

  it("returns single price when min equals max", () => {
    const result = computePriceRange([450_000]);
    expect(result?.minCents).toBe(450_000);
    expect(result?.maxCents).toBe(450_000);
    expect(result?.label).not.toContain("–");
  });

  it("formats price range with separator", () => {
    const result = computePriceRange([450_000, 1_200_000]);
    expect(result?.minCents).toBe(450_000);
    expect(result?.maxCents).toBe(1_200_000);
    expect(result?.label).toContain("–");
  });
});

describe("computePropertyMix", () => {
  it("groups and sorts by count desc", () => {
    const mix = computePropertyMix(["APARTMENT", "HOUSE", "APARTMENT", "APARTMENT", "house"]);
    expect(mix).toEqual([
      { type: "APARTMENT", count: 3 },
      { type: "HOUSE", count: 2 },
    ]);
  });

  it("ignores null/empty", () => {
    expect(computePropertyMix([null, "", undefined, "APARTMENT"])).toEqual([
      { type: "APARTMENT", count: 1 },
    ]);
  });
});

describe("computePurposeMix", () => {
  it("partitions into buy/rent/other", () => {
    const mix = computePurposeMix(["SALE", "RENT", "BUY", "ALUGUEL", "VENDA", "lease"]);
    expect(mix).toEqual({ buy: 3, rent: 2, other: 1 });
  });

  it("returns zeros for empty input", () => {
    expect(computePurposeMix([])).toEqual({ buy: 0, rent: 0, other: 0 });
  });
});

describe("computeTopNeighborhoods", () => {
  it("returns top N sorted by count", () => {
    const result = computeTopNeighborhoods(
      ["Boa Viagem", "Pina", "Boa Viagem", "Pina", "Boa Viagem", "Espinheiro"],
      2
    );
    expect(result).toEqual([
      { name: "Boa Viagem", count: 3 },
      { name: "Pina", count: 2 },
    ]);
  });
});

describe("computeRatingDistribution", () => {
  it("counts ratings 1-5 only", () => {
    const dist = computeRatingDistribution([
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
      { rating: 0 }, // ignored
      { rating: 6 }, // ignored
      { rating: 1 },
    ]);
    expect(dist).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 });
  });
});

describe("computeReviewReplyRate", () => {
  it("returns null on empty sample", () => {
    expect(computeReviewReplyRate([])).toBeNull();
  });

  it("computes ratio of replied texts", () => {
    expect(
      computeReviewReplyRate([{ replyText: "ok" }, { replyText: null }, { replyText: "  " }])
    ).toBe(1 / 3);
  });
});

describe("computeLastActivityDays", () => {
  it("returns null when no last activity", () => {
    expect(computeLastActivityDays(null)).toBeNull();
  });

  it("computes whole-day diff", () => {
    const now = new Date("2026-05-16T12:00:00Z");
    const ten = new Date("2026-05-06T12:00:00Z");
    expect(computeLastActivityDays(ten, now)).toBe(10);
  });

  it("clamps future dates to 0", () => {
    const now = new Date("2026-05-16T12:00:00Z");
    const future = new Date("2026-06-01T00:00:00Z");
    expect(computeLastActivityDays(future, now)).toBe(0);
  });
});

describe("computeExperienceBucket", () => {
  it("classifies experience", () => {
    expect(computeExperienceBucket(0)).toBe("novato");
    expect(computeExperienceBucket(2)).toBe("novato");
    expect(computeExperienceBucket(3)).toBe("experiente");
    expect(computeExperienceBucket(9)).toBe("experiente");
    expect(computeExperienceBucket(10)).toBe("veterano");
  });

  it("returns null when missing", () => {
    expect(computeExperienceBucket(null)).toBeNull();
    expect(computeExperienceBucket(undefined)).toBeNull();
  });
});

describe("computeSignatureStats", () => {
  it("hides rating when no rating", () => {
    const stats = computeSignatureStats({
      isAgency: false,
      avgRating: 0,
      totalRatings: 0,
      activeListings: 5,
      avgResponseTime: 30,
      experience: 5,
      yearsInBusiness: null,
      soldCount: 0,
      rentedCount: 0,
    });
    expect(stats.find((s) => s.key === "rating")).toBeUndefined();
  });

  it("uses yearsInBusiness for agency and experience for realtor", () => {
    const agency = computeSignatureStats({
      isAgency: true,
      avgRating: 0,
      totalRatings: 0,
      activeListings: 0,
      avgResponseTime: null,
      experience: 5,
      yearsInBusiness: 12,
      soldCount: 0,
      rentedCount: 0,
    });
    expect(agency.find((s) => s.key === "yearsInBusiness")?.value).toBe("12");
    expect(agency.find((s) => s.key === "experience")).toBeUndefined();

    const realtor = computeSignatureStats({
      isAgency: false,
      avgRating: 0,
      totalRatings: 0,
      activeListings: 0,
      avgResponseTime: null,
      experience: 5,
      yearsInBusiness: 12,
      soldCount: 0,
      rentedCount: 0,
    });
    expect(realtor.find((s) => s.key === "experience")?.value).toBe("5");
    expect(realtor.find((s) => s.key === "yearsInBusiness")).toBeUndefined();
  });
});
