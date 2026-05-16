"use client";

import { useMemo } from "react";
import AgencyPublicProfileSections from "@/components/realtor/AgencyPublicProfileSections";
import type { PublicProfileAggregates } from "@/lib/public-professional-profile";
import ProfileAboutSection from "./ProfileAboutSection";
import ProfileFinalCta from "./ProfileFinalCta";
import ProfileHeroV2 from "./ProfileHeroV2";
import ProfileOwnerToolbar from "./ProfileOwnerToolbar";
import ProfilePortfolioSection from "./ProfilePortfolioSection";
import type { PortfolioProperty } from "./PortfolioPropertyTile";
import ProfileReviewsPreview from "./ProfileReviewsPreview";
import ProfileShareSection from "./ProfileShareSection";
import ProfileSpecialtiesStrip from "./ProfileSpecialtiesStrip";
import ProfileStickyNav, { type StickyNavItem } from "./ProfileStickyNav";
import ProfileTrustRibbon from "./ProfileTrustRibbon";
import type { FactSheetVM } from "./ProfileFactSheet";

type ProfileV2RatingItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string | null;
  authorImage: string | null;
};

type ProfileV2Realtor = {
  id: string;
  name: string;
  role: "REALTOR" | "AGENCY";
  publicSlug: string | null;
  image: string | null;
  publicHeadline: string | null;
  publicBio: string | null;
  publicCity: string | null;
  publicState: string | null;
  publicServiceAreas: string[];
  instagram: string | null;
  linkedin: string | null;
  avgRating: number;
  totalRatings: number;
  experience: number | null;
  team: { id: string; name: string } | null;
  creci: string | null;
  creciState: string | null;
  creciValid?: boolean;
  lastActivityDays?: number | null;
};

type ProfileV2AgencyProfile = {
  website: string | null;
  specialties: string[];
  yearsInBusiness: number | null;
  serviceAreas: string[];
  completion: {
    score: number;
    checklist: Array<{ key: string; label: string; done: boolean }>;
  } | null;
  teamMembers: Array<{
    id: string;
    name: string;
    image: string | null;
    headline: string | null;
    publicSlug: string | null;
    whatsappHref: string | null;
  }>;
  ctaCards: Array<{
    key: string;
    intent: "BUY" | "RENT" | "LIST";
    title: string;
    description: string;
    actionLabel: string;
    href: string | null;
    contactName: string | null;
    helper: string | null;
  }>;
  operationMetrics: Array<{
    label: string;
    value: string;
    helper: string;
  }>;
};

interface ProfileV2LayoutProps {
  pageUrl: string;
  realtor: ProfileV2Realtor;
  properties: PortfolioProperty[];
  aggregates: PublicProfileAggregates;
  initialRatingsPreview: ProfileV2RatingItem[];
  agencyProfile: ProfileV2AgencyProfile | null;
  isOwner: boolean;
  whatsappAction?: () => void;
  whatsappHrefBuilder: ((message: string) => string | null) | null;
  telHref: string | null;
  onOpenReviews: (source: string) => void;
  onOpenShare: () => void;
  onOpenOverlay: (id: string, source: string) => void;
}

function buildFactSheet(
  realtor: ProfileV2Realtor,
  agencyProfile: ProfileV2AgencyProfile | null
): FactSheetVM {
  const isAgency = realtor.role === "AGENCY";
  const items: FactSheetVM["items"] = [];

  if (realtor.publicCity && realtor.publicState) {
    items.push({
      label: "Base de atuação",
      value: `${realtor.publicCity}/${realtor.publicState}`,
    });
  } else if (realtor.publicCity || realtor.publicState) {
    items.push({
      label: "Base de atuação",
      value: realtor.publicCity || realtor.publicState,
    });
  }

  if (realtor.creci) {
    items.push({
      label: "CRECI",
      value: realtor.creciState ? `${realtor.creci}/${realtor.creciState}` : realtor.creci,
      verified: realtor.creciValid === true,
    });
  }

  if (!isAgency && realtor.experience != null && realtor.experience > 0) {
    items.push({
      label: "Experiência",
      value: `${realtor.experience} ano${realtor.experience === 1 ? "" : "s"}`,
    });
  }

  if (isAgency && agencyProfile?.yearsInBusiness && agencyProfile.yearsInBusiness > 0) {
    items.push({
      label: "Anos no mercado",
      value: `${agencyProfile.yearsInBusiness} ano${agencyProfile.yearsInBusiness === 1 ? "" : "s"}`,
    });
  }

  if (isAgency && agencyProfile?.website) {
    items.push({
      label: "Website",
      value: agencyProfile.website,
      href: agencyProfile.website,
    });
  }

  if (realtor.team?.name && !isAgency) {
    items.push({
      label: "Vinculado a",
      value: realtor.team.name,
    });
  }

  const specialties = isAgency
    ? agencyProfile?.specialties ?? []
    : []; // realtor specialties live in realtorApplication — surfaced via SpecialtiesStrip when present

  const serviceAreas = realtor.publicServiceAreas.filter((value) => value && value.trim());

  return { items, specialties, serviceAreas };
}

export default function ProfileV2Layout({
  pageUrl,
  realtor,
  properties,
  aggregates,
  initialRatingsPreview,
  agencyProfile,
  isOwner,
  whatsappAction,
  whatsappHrefBuilder,
  telHref,
  onOpenReviews,
  onOpenShare,
  onOpenOverlay,
}: ProfileV2LayoutProps) {
  const isAgency = realtor.role === "AGENCY";
  const roleLabel = isAgency
    ? "Imobiliária"
    : realtor.team?.name
      ? `Corretor · ${realtor.team.name}`
      : "Corretor";
  const locationLabel = [realtor.publicCity, realtor.publicState].filter(Boolean).join("/") || null;
  const tagline =
    realtor.publicHeadline ||
    (realtor.publicBio ? realtor.publicBio.split("\n")[0]?.slice(0, 220) : null);

  const factSheet = useMemo(() => buildFactSheet(realtor, agencyProfile), [realtor, agencyProfile]);

  const specialties = useMemo(() => {
    if (isAgency) return agencyProfile?.specialties ?? [];
    return []; // Realtor specialty chips come from RealtorApplication; not yet on the public payload.
  }, [agencyProfile?.specialties, isAgency]);

  const navItems = useMemo<StickyNavItem[]>(() => {
    const items: StickyNavItem[] = [{ kind: "link", id: "about", label: "Sobre" }];
    if (properties.length > 0) {
      items.push({ kind: "link", id: "grid", label: "Imóveis" });
    }
    if (realtor.totalRatings > 0 || initialRatingsPreview.length > 0) {
      items.push({ kind: "link", id: "reviews", label: "Avaliações" });
    }
    if (isAgency && (agencyProfile?.teamMembers?.length ?? 0) > 0) {
      items.push({ kind: "link", id: "team", label: "Equipe" });
    }
    if (isOwner) {
      items.push({ kind: "link", id: "share", label: "Compartilhar" });
    }
    items.push({
      kind: "action",
      label: "Avaliações",
      onClick: () => onOpenReviews("sticky_nav"),
    });
    return items;
  }, [
    agencyProfile?.teamMembers?.length,
    initialRatingsPreview.length,
    isAgency,
    isOwner,
    onOpenReviews,
    properties.length,
    realtor.totalRatings,
  ]);

  const isSparse = aggregates.totalActiveProperties <= 2;

  return (
    <>
      {isOwner ? (
        <ProfileOwnerToolbar
          completionScore={agencyProfile?.completion?.score}
          isAgency={isAgency}
        />
      ) : null}

      <ProfileHeroV2
        name={realtor.name}
        image={realtor.image}
        roleLabel={roleLabel}
        locationLabel={locationLabel}
        creci={realtor.creci}
        creciState={realtor.creciState}
        creciValid={Boolean(realtor.creciValid)}
        tagline={tagline}
        lastActivityDays={realtor.lastActivityDays ?? null}
        priceRange={aggregates.priceRange}
        signatureStats={aggregates.signatureStats}
        totalRatings={realtor.totalRatings}
        whatsappAction={whatsappAction}
        telHref={telHref}
        reviewsAction={
          realtor.totalRatings > 0 ? () => onOpenReviews("hero_reviews_cta") : undefined
        }
        shareAction={onOpenShare}
      />

      {aggregates.badges.length > 0 ? (
        <ProfileTrustRibbon badges={aggregates.badges} className="-mt-2 pb-6" />
      ) : null}

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <ProfileStickyNav items={navItems} />

        <ProfileAboutSection name={realtor.name} bio={realtor.publicBio} factSheet={factSheet} />

        <ProfileSpecialtiesStrip
          specialties={specialties}
          topNeighborhoods={aggregates.topNeighborhoods}
        />

        <ProfilePortfolioSection
          realtorName={realtor.name}
          properties={properties}
          totalActiveProperties={aggregates.totalActiveProperties}
          onOpenOverlay={(id) => onOpenOverlay(id, "profile_v2_portfolio")}
          whatsappHref={whatsappHrefBuilder}
        />

        <ProfileReviewsPreview
          ratings={initialRatingsPreview}
          totalRatings={realtor.totalRatings}
          avgRating={realtor.avgRating}
          distribution={aggregates.ratingDistribution}
          reviewReplyRate={aggregates.reviewReplyRate}
          onOpenReviews={() => onOpenReviews("preview")}
        />

        {isAgency && agencyProfile ? (
          <AgencyPublicProfileSections
            agencySlug={realtor.publicSlug}
            agencyName={realtor.name}
            website={agencyProfile.website}
            specialties={agencyProfile.specialties}
            yearsInBusiness={agencyProfile.yearsInBusiness}
            serviceAreas={agencyProfile.serviceAreas}
            completion={agencyProfile.completion}
            teamMembers={agencyProfile.teamMembers}
            ctaCards={agencyProfile.ctaCards}
            operationMetrics={agencyProfile.operationMetrics}
          />
        ) : null}

        <ProfileFinalCta
          realtorName={realtor.name}
          realtorImage={realtor.image}
          whatsappAction={whatsappAction}
          telHref={telHref}
          variant={isSparse ? "sparse" : "default"}
        />

        {isOwner ? (
          <ProfileShareSection pageUrl={pageUrl} onOpenSharePanel={onOpenShare} />
        ) : null}
      </div>
    </>
  );
}
