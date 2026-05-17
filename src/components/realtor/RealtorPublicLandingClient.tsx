"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle } from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import { track } from "@/lib/analytics";
import PropertyDetailsModalJames from "@/components/PropertyDetailsModalJames";
import RealtorReviewsSection from "@/components/realtor/RealtorReviewsSection";
import ProfileV2Layout from "@/components/realtor/public/ProfileV2Layout";
import PublicProfileSharePanel from "@/components/realtor/public/PublicProfileSharePanel";
import type { PublicProfileAggregates } from "@/lib/public-professional-profile";

type PublicProperty = {
  id: string;
  title: string;
  price: number | null;
  type: string;
  inCondominium?: boolean | null;
  purpose: string | null;
  city: string;
  state: string;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  parkingSpots: number | null;
  yearBuilt: number | null;
  condoFee: number | null;
  iptuYearly: number | null;
  furnished: boolean | null;
  petFriendly: boolean | null;
  petsSmall: boolean | null;
  petsLarge: boolean | null;
  hasPool: boolean | null;
  hasGym: boolean | null;
  hasElevator: boolean | null;
  hasBalcony: boolean | null;
  hasPlayground: boolean | null;
  hasPartyRoom: boolean | null;
  hasGourmet: boolean | null;
  hasConcierge24h: boolean | null;
  comfortAC: boolean | null;
  comfortHeating: boolean | null;
  comfortSolar: boolean | null;
  comfortNoiseWindows: boolean | null;
  comfortLED: boolean | null;
  comfortWaterReuse: boolean | null;
  accRamps: boolean | null;
  accWideDoors: boolean | null;
  accAccessibleElevator: boolean | null;
  accTactile: boolean | null;
  finishCabinets: boolean | null;
  finishCounterGranite: boolean | null;
  finishCounterQuartz: boolean | null;
  viewSea: boolean | null;
  viewCity: boolean | null;
  viewRiver: boolean | null;
  viewLake: boolean | null;
  conditionTags: string[];
  createdAt: string;
  updatedAt: string;
  leadsCount: number;
  viewsCount: number;
  images: { url: string }[];
};

type RealtorPublicLandingClientProps = {
  siteUrl: string;
  pageUrl: string;
  realtor: {
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
    publicWhatsApp: string | null;
    publicPhoneOptIn: boolean;
    phoneVerified: boolean;
    phone: string | null;
    instagram: string | null;
    linkedin: string | null;
    avgRating: number;
    totalRatings: number;
    avgResponseTime: number | null;
    experience: number | null;
    soldCount: number;
    rentedCount: number;
    lastActivity: string | null;
    team: { id: string; name: string } | null;
    creci: string | null;
    creciState: string | null;
    creciExpiry?: string | null;
    creciValid?: boolean;
    lastActivityDays?: number | null;
  };
  properties: PublicProperty[];
  initialRatingsPreview: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    authorName: string | null;
    authorImage: string | null;
  }>;
  agencyProfile?: {
    website: string | null;
    specialties: string[];
    yearsInBusiness: number | null;
    serviceAreas: string[];
    completion: {
      score: number;
      checklist: Array<{ key: string; label: string; done: boolean }>;
    };
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
  } | null;
  aggregates: PublicProfileAggregates;
};

function normalizePhone(value: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || null;
}

function buildWhatsAppUrl(phoneDigits: string, message: string) {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

function formatPhoneForTel(value: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `+${digits}` : null;
}

export default function RealtorPublicLandingClient({
  siteUrl,
  pageUrl,
  realtor,
  properties,
  initialRatingsPreview,
  agencyProfile,
  aggregates,
}: RealtorPublicLandingClientProps) {
  void siteUrl;
  const { data: session } = useSession();

  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const reviewsHistoryPushedRef = useRef(false);
  const closingFromPopstateRef = useRef(false);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayPropertyId, setOverlayPropertyId] = useState<string | null>(null);

  const isOwner = useMemo(() => {
    const sid =
      (session as { user?: { id?: string }; userId?: string } | null)?.user?.id ||
      (session as { userId?: string } | null)?.userId;
    return Boolean(sid && String(sid) === String(realtor.id));
  }, [realtor.id, session]);

  const whatsappDigits = useMemo(() => {
    const wa = normalizePhone(realtor.publicWhatsApp);
    if (wa) return wa;
    if (realtor.publicPhoneOptIn && realtor.phoneVerified) {
      const phone = normalizePhone(realtor.phone);
      if (phone) return phone;
    }
    return null;
  }, [realtor.phone, realtor.phoneVerified, realtor.publicPhoneOptIn, realtor.publicWhatsApp]);

  const serviceAreaChips = useMemo(() => {
    const areas = Array.isArray(realtor.publicServiceAreas) ? realtor.publicServiceAreas : [];
    return areas.map((a) => String(a || "").trim()).filter(Boolean);
  }, [realtor.publicServiceAreas]);

  const locationLabel = useMemo(() => {
    const loc = [realtor.publicCity, realtor.publicState].filter(Boolean).join("/");
    return loc || null;
  }, [realtor.publicCity, realtor.publicState]);

  const defaultRegionLabel = useMemo(() => {
    return serviceAreaChips[0] || locationLabel || "sua região";
  }, [locationLabel, serviceAreaChips]);

  const baseIntroMessage = useMemo(() => {
    return `Oi, vim do seu perfil no OggaHub. Quero receber opções de imóveis em ${defaultRegionLabel}. Pode me ajudar?`;
  }, [defaultRegionLabel]);

  const telHref = useMemo(() => {
    if (!realtor.publicPhoneOptIn || !realtor.phoneVerified) return null;
    return formatPhoneForTel(realtor.phone);
  }, [realtor.phone, realtor.phoneVerified, realtor.publicPhoneOptIn]);

  const handleWhatsApp = useCallback(
    (message: string, action: string) => {
      if (!whatsappDigits) return;
      try {
        track({ name: "whatsapp_click", payload: { action } } as never);
      } catch {
        // best-effort
      }
      window.open(
        buildWhatsAppUrl(whatsappDigits, message),
        "_blank",
        "noopener,noreferrer"
      );
    },
    [whatsappDigits]
  );

  const openReviews = useCallback((source: string) => {
    setReviewsOpen(true);
    try {
      track({ name: "public_profile_reviews_open", payload: { source } } as never);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!reviewsOpen) {
      reviewsHistoryPushedRef.current = false;
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    if (!reviewsHistoryPushedRef.current) {
      try {
        const nextState = { ...(window.history.state || {}), __reviewsOverlay: true };
        window.history.pushState(nextState, "", window.location.href);
        reviewsHistoryPushedRef.current = true;
      } catch {
        // ignore
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReviewsOpen(false);
    };

    const onPopState = () => {
      if (!reviewsHistoryPushedRef.current) return;
      reviewsHistoryPushedRef.current = false;
      closingFromPopstateRef.current = true;
      setReviewsOpen(false);
      closingFromPopstateRef.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
    };
  }, [reviewsOpen]);

  const closeReviewsOverlay = useCallback(() => {
    if (typeof window !== "undefined") {
      document.body.style.overflow = "";
      if (reviewsHistoryPushedRef.current && !closingFromPopstateRef.current) {
        try {
          window.history.back();
          return;
        } catch {
          // fallthrough
        }
      }
    }
    reviewsHistoryPushedRef.current = false;
    setReviewsOpen(false);
  }, []);

  const openOverlay = useCallback((propertyId: string, source: string) => {
    setOverlayPropertyId(propertyId);
    setOverlayOpen(true);
    try {
      track({ name: "property_quickview_open", payload: { propertyId, source } } as never);
    } catch {
      // best-effort
    }
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayOpen(false);
    setOverlayPropertyId(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenOverlay = (e: Event) => {
      const ce = e as CustomEvent<{ id?: string }>;
      if (ce?.detail?.id) {
        openOverlay(String(ce.detail.id), "profile_map");
      }
    };
    window.addEventListener("open-overlay", handleOpenOverlay as EventListener);
    return () => window.removeEventListener("open-overlay", handleOpenOverlay as EventListener);
  }, [openOverlay]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      <div className="sticky top-0 z-[300] border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <ModernNavbar forceLight={true} />
      </div>

      <main className="pb-32 md:pb-12">
        <ProfileV2Layout
          pageUrl={pageUrl}
          realtor={realtor}
          properties={properties}
          aggregates={aggregates}
          initialRatingsPreview={initialRatingsPreview}
          agencyProfile={agencyProfile ?? null}
          isOwner={isOwner}
          whatsappAction={
            whatsappDigits ? () => handleWhatsApp(baseIntroMessage, "hero_primary") : undefined
          }
          whatsappHrefBuilder={
            whatsappDigits ? (message) => buildWhatsAppUrl(whatsappDigits, message) : null
          }
          telHref={telHref}
          onOpenReviews={openReviews}
          onOpenShare={() => setShareOpen(true)}
          onOpenOverlay={(id, source) => openOverlay(id, source)}
        />
      </main>

      <PublicProfileSharePanel
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        pageUrl={pageUrl}
        realtorName={realtor.name}
        realtorWhatsappDigits={whatsappDigits}
      />

      {reviewsOpen ? (
        <div className="fixed inset-0 z-[60000]">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeReviewsOverlay}
          />
          <div className="relative h-full w-full flex items-center justify-center p-0 sm:p-6">
            <div className="relative h-full w-full overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl sm:h-[min(920px,calc(100vh-3rem))] sm:max-w-6xl sm:rounded-3xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
                <div className="text-base font-semibold text-slate-900">Avaliações</div>
                <button
                  type="button"
                  onClick={closeReviewsOverlay}
                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Fechar
                </button>
              </div>
              <div className="h-[calc(100%-53px)] overflow-y-auto bg-slate-50 p-4 sm:p-6">
                <RealtorReviewsSection
                  realtorId={realtor.id}
                  initialAvgRating={realtor.avgRating}
                  initialTotalRatings={realtor.totalRatings}
                  embedded
                  variant="google"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PropertyDetailsModalJames
        propertyId={overlayPropertyId}
        open={overlayOpen}
        onClose={closeOverlay}
      />

      {whatsappDigits && !reviewsOpen && !overlayOpen ? (
        <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200 bg-white/90 p-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => handleWhatsApp(baseIntroMessage, "sticky_mobile")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-400 hover:shadow"
          >
            <MessageCircle className="h-5 w-5" />
            Falar no WhatsApp
          </button>
        </div>
      ) : null}
    </div>
  );
}
