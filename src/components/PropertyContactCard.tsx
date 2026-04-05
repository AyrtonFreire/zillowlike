"use client";

import { useEffect, useMemo, useState } from "react";
import { User, Building2, MessageCircle, ExternalLink, Timer, Phone, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getPublicProfilePathByRole } from "@/lib/public-profile";
import { useToast } from "@/contexts/ToastContext";
import RatingStars from "@/components/queue/RatingStars";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M19.11 17.29c-.28-.14-1.67-.82-1.93-.92-.26-.09-.45-.14-.64.14-.19.28-.74.92-.91 1.11-.17.19-.33.21-.61.07-.28-.14-1.18-.43-2.25-1.38-.83-.74-1.39-1.65-1.56-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.19-.28.28-.47.09-.19.05-.36-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.46-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.28-1 1-1 2.43 0 1.43 1.02 2.81 1.16 3 .14.19 2.01 3.07 4.87 4.31.68.29 1.2.46 1.61.59.68.21 1.29.18 1.78.11.54-.08 1.67-.68 1.9-1.34.24-.66.24-1.22.17-1.34-.07-.12-.26-.19-.54-.33z"
      />
      <path
        fill="currentColor"
        d="M16.02 3C9.39 3 4 8.39 4 15.02c0 2.1.55 4.16 1.6 5.98L4 29l8.2-1.55c1.76.96 3.75 1.47 5.82 1.47 6.63 0 12.02-5.39 12.02-12.02C30.04 8.39 22.65 3 16.02 3zm0 23.7c-1.88 0-3.71-.5-5.31-1.44l-.38-.22-4.87.92.92-4.75-.25-.4a10.64 10.64 0 0 1-1.63-5.79c0-5.88 4.78-10.66 10.66-10.66 5.88 0 10.66 4.78 10.66 10.66 0 5.88-4.78 10.68-10.66 10.68z"
      />
    </svg>
  );
}

type ContactCardVariant = "card" | "compact" | "compact-showcase" | "sticky";

type ContactCardProps = {
  propertyId: string;
  propertyTitle: string;
  propertyPurpose?: "SALE" | "RENT";
  disableActions?: boolean;
  variant?: ContactCardVariant;
  
  // Owner/Realtor info
  ownerRole: "USER" | "OWNER" | "REALTOR" | "AGENCY" | "ADMIN";
  ownerName?: string;
  ownerImage?: string;
  ownerPhone?: string;
  ownerPublicProfileEnabled?: boolean;
  ownerPublicSlug?: string | null;
  ownerPublicPhoneOptIn?: boolean;
  hideOwnerContact?: boolean;
  
  // Contact settings
};

export default function PropertyContactCard({
  propertyId,
  propertyTitle,
  disableActions,
  variant = "card",
  ownerRole,
  ownerName,
  ownerImage,
  ownerPublicProfileEnabled,
  ownerPublicSlug,
  ownerPublicPhoneOptIn,
  hideOwnerContact,
}: ContactCardProps) {
  const [chatLoading, setChatLoading] = useState(false);
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [publicStatsLoading, setPublicStatsLoading] = useState(false);
  const [contactAvailability, setContactAvailability] = useState<{ whatsapp: boolean; phone: boolean } | null>(null);
  const [publicStats, setPublicStats] = useState<null | {
    avgRating: number;
    totalRatings: number;
    activeListings: number;
    completedDeals: number;
    avgResponseTime: number | null;
    isFastResponder: boolean;
    isTopProducer: boolean;
    creci: string | null;
    creciState: string | null;
    headline: string | null;
    city: string | null;
    state: string | null;
  }>(null);
  const toast = useToast();
  const { data: session } = useSession();
  const router = useRouter();

  const isAuthenticated = !!session;

  // Determinar cenário
  const isRealtorOrAgency = ownerRole === "REALTOR" || ownerRole === "AGENCY";
  const hasPublicProfile =
    (isRealtorOrAgency && !!ownerPublicSlug) ||
    (!isRealtorOrAgency && !!ownerPublicProfileEnabled && !!ownerPublicSlug);
  const publicProfileHref = useMemo(
    () =>
      getPublicProfilePathByRole({
        role: ownerRole,
        publicSlug: ownerPublicSlug || null,
        publicProfileEnabled: ownerPublicProfileEnabled,
      }),
    [ownerPublicProfileEnabled, ownerPublicSlug, ownerRole]
  );

  useEffect(() => {
    const slug = String(ownerPublicSlug || "").trim();
    if ((variant !== "card" && variant !== "compact-showcase") || !isRealtorOrAgency || !slug) {
      setPublicStats(null);
      return;
    }

    let cancelled = false;
    setPublicStatsLoading(true);
    fetch(`/api/public/realtors/${encodeURIComponent(slug)}/card`, { cache: "force-cache" })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json) return null;

        const stats = json?.stats || {};
        const badges = json?.badges || {};
        return {
          avgRating: Number(stats.avgRating || 0),
          totalRatings: Number(stats.totalRatings || 0),
          activeListings: Number(stats.activeListings || 0),
          completedDeals: Number(stats.completedDeals || 0),
          avgResponseTime: stats.avgResponseTime == null ? null : Number(stats.avgResponseTime),
          isFastResponder: Boolean(badges.isFastResponder),
          isTopProducer: Boolean(badges.isTopProducer),
          creci: json?.creci ? String(json.creci) : null,
          creciState: json?.creciState ? String(json.creciState) : null,
          headline: json?.headline ? String(json.headline) : null,
          city: json?.city ? String(json.city) : null,
          state: json?.state ? String(json.state) : null,
        };
      })
      .then((next) => {
        if (cancelled) return;
        setPublicStats(next);
      })
      .catch(() => {
        if (cancelled) return;
        setPublicStats(null);
      })
      .finally(() => {
        if (cancelled) return;
        setPublicStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isRealtorOrAgency, ownerPublicSlug, variant]);

  const canShowWhatsApp = useMemo(() => {
    // Para corretores/imobiliárias: se houver opt-in no perfil, respeita; caso contrário, esconde.
    if (isRealtorOrAgency) return !!ownerPublicPhoneOptIn;
    if (hideOwnerContact) return false;
    // Para pessoa física: o controle é por imóvel (hideOwnerContact).
    return true;
  }, [hideOwnerContact, isRealtorOrAgency, ownerPublicPhoneOptIn]);

  const canShowPhone = useMemo(() => {
    if (isRealtorOrAgency) return !!ownerPublicPhoneOptIn;
    if (hideOwnerContact) return false;
    return true;
  }, [hideOwnerContact, isRealtorOrAgency, ownerPublicPhoneOptIn]);

  useEffect(() => {
    if (variant !== "sticky") {
      setContactAvailability(null);
      return;
    }

    let cancelled = false;
    fetch(`/api/properties/${propertyId}/whatsapp`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json) {
          setContactAvailability({ whatsapp: false, phone: false });
          return;
        }
        setContactAvailability({
          whatsapp: !!String(json?.whatsappUrl || "").trim(),
          phone: !!String(json?.phoneUrl || "").trim(),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setContactAvailability({ whatsapp: false, phone: false });
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId, variant]);

  const canUseWhatsAppAction = !disableActions && (contactAvailability ? contactAvailability.whatsapp : canShowWhatsApp);
  const canUsePhoneAction = !disableActions && (contactAvailability ? contactAvailability.phone : canShowPhone);

  const fetchContactTargets = async (method: "GET" | "POST") => {
    const res = await fetch(`/api/properties/${propertyId}/whatsapp`, { method });
    const data = await res.json().catch(() => ({} as any));
    return {
      ok: res.ok,
      whatsappUrl: data?.whatsappUrl as string | undefined,
      phoneUrl: data?.phoneUrl as string | undefined,
    };
  };

  const handleWhatsAppClick = async () => {
    try {
      if (disableActions) return;
      if (!canUseWhatsAppAction) {
        toast.info("Contato via WhatsApp não está disponível para este anúncio.");
        return;
      }

      setWhatsAppLoading(true);

      const primary = await fetchContactTargets("POST");
      const fallback = primary.ok && primary.whatsappUrl ? primary : await fetchContactTargets("GET");

      if (!fallback.ok || !fallback.whatsappUrl) {
        toast.error("WhatsApp indisponível no momento.");
        return;
      }

      window.open(fallback.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("WhatsApp indisponível no momento.");
    } finally {
      setWhatsAppLoading(false);
    }
  };

  const handlePhoneClick = async () => {
    try {
      if (disableActions) return;
      if (!canUsePhoneAction) {
        toast.info("Contato por telefone não está disponível para este anúncio.");
        return;
      }

      setPhoneLoading(true);
      const result = await fetchContactTargets("GET");

      if (!result.ok || !result.phoneUrl) {
        toast.error("Telefone indisponível no momento.");
        return;
      }

      window.location.href = result.phoneUrl;
    } catch {
      toast.error("Telefone indisponível no momento.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const getChatCallbackUrl = () => {
    return `/chats?openChat=1&propertyId=${encodeURIComponent(propertyId)}&direct=1`;
  };

  const createLeadAndOpenChat = async () => {
    try {
      if (disableActions) return;
      if (!isAuthenticated) {
        await signIn(undefined, { callbackUrl: getChatCallbackUrl() });
        return;
      }

      const s: any = session as any;
      const name = String(s?.user?.name || s?.user?.fullName || "").trim();
      const email = String(s?.user?.email || "").trim();
      if (!name || name.length < 2 || !email) {
        toast.error("Para usar o chat, complete seu nome e e-mail na sua conta.");
        return;
      }

      setChatLoading(true);

      const payload: any = {
        propertyId,
        name,
        email,
        phone: String(s?.user?.phone || "").trim() || undefined,
        isDirect: true,
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data?.error ||
          (res.status === 429
            ? "Muitas tentativas. Tente novamente em alguns instantes."
            : "Não conseguimos abrir o chat agora.");
        throw new Error(msg);
      }

      const leadId = String(data?.leadId || "");
      if (!leadId) {
        throw new Error("Não conseguimos abrir o chat agora.");
      }

      router.push(`/chats?lead=${encodeURIComponent(leadId)}`);
    } catch (err: any) {
      toast.error(err?.message || "Não conseguimos abrir o chat agora.");
    } finally {
      setChatLoading(false);
    }
  };

  const ratingLabel = useMemo(() => {
    const avg = publicStats?.avgRating ?? 0;
    const total = publicStats?.totalRatings ?? 0;
    if (!total || avg <= 0) return "";
    return `${avg.toFixed(1)} (${total})`;
  }, [publicStats?.avgRating, publicStats?.totalRatings]);

  const responseLabel = useMemo(() => {
    const v = publicStats?.avgResponseTime;
    if (v == null || Number.isNaN(Number(v)) || Number(v) <= 0) return "";
    const minutes = Math.round(Number(v));
    if (minutes < 1) return "Responde rápido";
    if (minutes < 60) return `Responde em ~${minutes} min`;
    const hours = Math.round(minutes / 60);
    return `Responde em ~${hours}h`;
  }, [publicStats?.avgResponseTime]);

  const ownerRoleLabel = ownerRole === "AGENCY" ? "Imobiliária" : ownerRole === "REALTOR" ? "Corretor" : "Anunciante";

  const renderIdentityAvatar = (sizeClass: string, iconClass: string, radiusClass: string, framed = false) => {
    if (ownerImage) {
      return (
        <div className={`relative overflow-hidden bg-white ${sizeClass} ${radiusClass} ${framed ? "border border-black/5 shadow-sm" : "border border-teal/15 shadow-sm"}`}>
          <Image src={ownerImage} alt={ownerName || "Anunciante"} fill className="object-cover" />
        </div>
      );
    }

    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-teal/10 to-teal/25 ${sizeClass} ${radiusClass} ${framed ? "border border-black/5" : "border border-teal/10"}`}>
        {ownerRole === "AGENCY" ? <Building2 className={iconClass} /> : <User className={iconClass} />}
      </div>
    );
  };

  const profileAction = ({
    label,
    subtle = false,
    tone = "default",
  }: {
    label: string;
    subtle?: boolean;
    tone?: "default" | "inverse";
  }) => {
    if (!hasPublicProfile || !publicProfileHref) return null;

    const className = subtle
      ? tone === "inverse"
        ? "inline-flex items-center gap-1 text-xs font-medium text-white/75"
        : "inline-flex items-center gap-1 text-xs font-medium text-gray-500"
      : tone === "inverse"
        ? "inline-flex items-center gap-1 text-sm font-medium text-white/85"
        : "inline-flex items-center gap-1 text-sm font-medium text-gray-700";

    return (
      <Link
        href={publicProfileHref}
        onClick={(e) => {
          if (disableActions) e.preventDefault();
        }}
        className={className}
      >
        <span>{label}</span>
        <ChevronRight className="h-4 w-4" />
      </Link>
    );
  };

  const renderCompactOption = (option: "editorial" | "premium" | "trust") => {
    if (option === "editorial") {
      return (
        <div className="rounded-xl bg-neutral-50/80 px-4 py-3 ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            {renderIdentityAvatar("h-10 w-10", "h-4 w-4 text-teal", "rounded-xl", true)}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">Anunciado por</p>
              <p className="mt-1 truncate text-[15px] font-semibold text-gray-900">{ownerName || "Anunciante"}</p>
              <p className="mt-0.5 text-xs font-medium text-gray-500">{ownerRoleLabel}</p>
            </div>
            {profileAction({ label: "Ver perfil" })}
          </div>
        </div>
      );
    }

    if (option === "premium") {
      return (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
          <div className="flex items-start gap-3">
            {renderIdentityAvatar("h-11 w-11", "h-4.5 w-4.5 text-white", "rounded-xl", true)}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                  Perfil profissional
                </span>
              </div>
              <p className="mt-3 truncate text-base font-semibold text-white">{ownerName || "Anunciante"}</p>
              <p className="mt-1 text-sm text-white/70">{ownerRoleLabel}</p>
              <div className="mt-3">{profileAction({ label: "Conhecer perfil", tone: "inverse" })}</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          {renderIdentityAvatar("h-11 w-11", "h-4.5 w-4.5 text-teal", "rounded-2xl")}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Anunciado por</p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-900">{ownerName || "Anunciante"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>{ownerRoleLabel}</span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">Perfil profissional</span>
              {!!responseLabel ? (
                <>
                  <span className="h-1 w-1 rounded-full bg-gray-300" />
                  <span className="font-medium text-gray-600">{responseLabel}</span>
                </>
              ) : null}
            </div>
          </div>
          {profileAction({ label: "Ver", subtle: true })}
        </div>
      </div>
    );
  };

  if (variant === "compact-showcase") {
    const options: Array<{ key: "editorial" | "premium" | "trust"; title: string }> = [
      { key: "editorial", title: "Opção 1 · Editorial minimalista" },
      { key: "premium", title: "Opção 2 · Premium institucional" },
      { key: "trust", title: "Opção 3 · Confiança + conversão" },
    ];

    return (
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.key} className="space-y-2">
            <p className="px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">{option.title}</p>
            {renderCompactOption(option.key)}
          </div>
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return renderCompactOption("editorial");
  }

  if (variant === "sticky") {
    const buttonBase = "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400";

    return (
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/80 bg-white/95 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] shadow-[0_-12px_30px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <button
            type="button"
            onClick={handlePhoneClick}
            disabled={!canUsePhoneAction || phoneLoading}
            className={`${buttonBase} border-gray-200 bg-white text-gray-800 hover:bg-gray-50`}
          >
            <Phone className="h-5 w-5" />
            <span className="truncate">{phoneLoading ? "Abrindo..." : "Telefone"}</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppClick}
            disabled={!canUseWhatsAppAction || whatsAppLoading}
            className={`${buttonBase} border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400`}
          >
            <WhatsAppIcon className="h-5 w-5" />
            <span className="truncate">{whatsAppLoading ? "Abrindo..." : "WhatsApp"}</span>
          </button>

          <button
            type="button"
            onClick={createLeadAndOpenChat}
            disabled={!!disableActions || chatLoading}
            className={`${buttonBase} border-teal-600 bg-teal-600 text-white hover:bg-teal-700 hover:border-teal-700 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400`}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="truncate">{chatLoading ? "Abrindo..." : "Chat"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header: foto/logo do corretor/imobiliária (se aplicável) */}
      {isRealtorOrAgency && ownerName && (
        <div className="p-6 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          <div className="flex items-start justify-between gap-3">
            {hasPublicProfile && publicProfileHref ? (
              <Link
                href={publicProfileHref}
                onClick={(e) => {
                  if (disableActions) e.preventDefault();
                }}
                className="flex items-start gap-3 rounded-xl -mx-1 px-1 py-1 hover:bg-teal/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-light focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {ownerImage ? (
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-teal/15 bg-white shadow-sm">
                    <Image src={ownerImage} alt={ownerName} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal/10 to-teal/30 flex items-center justify-center border border-teal/10">
                    {ownerRole === "AGENCY" ? (
                      <Building2 className="w-7 h-7 text-teal" />
                    ) : (
                      <User className="w-7 h-7 text-teal" />
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="font-extrabold text-gray-900 text-base leading-tight line-clamp-2">{ownerName}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {ownerRole === "AGENCY" ? "Imobiliária" : "Corretor"}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex items-start gap-3">
                {ownerImage ? (
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-teal/15 bg-white shadow-sm">
                    <Image src={ownerImage} alt={ownerName} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal/10 to-teal/30 flex items-center justify-center border border-teal/10">
                    {ownerRole === "AGENCY" ? (
                      <Building2 className="w-7 h-7 text-teal" />
                    ) : (
                      <User className="w-7 h-7 text-teal" />
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-extrabold text-gray-900 text-base leading-tight line-clamp-2">{ownerName}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {ownerRole === "AGENCY" ? "Imobiliária" : "Corretor"}
                  </p>
                </div>
              </div>
            )}

            {hasPublicProfile && publicProfileHref && (
              <Link
                href={publicProfileHref}
                onClick={(e) => {
                  if (disableActions) e.preventDefault();
                }}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                title="Ver perfil"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            )}
          </div>

          {publicStatsLoading && (
            <div className="mt-4 grid grid-cols-3 gap-2 animate-pulse">
              <div className="h-10 rounded-xl bg-gray-200" />
              <div className="h-10 rounded-xl bg-gray-200" />
              <div className="h-10 rounded-xl bg-gray-200" />
            </div>
          )}

          {!publicStatsLoading && publicStats && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                {publicStats.totalRatings > 0 && publicStats.avgRating > 0 && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-800">
                    <RatingStars readonly rating={Math.round(publicStats.avgRating)} size="sm" />
                    {ratingLabel}
                    <span className="sr-only">Avaliações</span>
                  </span>
                )}

                {publicStats.activeListings > 0 && (
                  hasPublicProfile && publicProfileHref ? (
                    <Link
                      href={`${publicProfileHref}#anuncios`}
                      onClick={(e) => {
                        if (disableActions) e.preventDefault();
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-light focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      title="Ver anúncios do anunciante"
                    >
                      <Building2 className="w-4 h-4 text-teal-700" />
                      {publicStats.activeListings} anúncio{publicStats.activeListings === 1 ? "" : "s"}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-800">
                      <Building2 className="w-4 h-4 text-teal-700" />
                      {publicStats.activeListings} anúncio{publicStats.activeListings === 1 ? "" : "s"}
                    </span>
                  )
                )}

                {publicStats.completedDeals > 0 && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-800">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                      ✓
                    </span>
                    {publicStats.completedDeals} fechado{publicStats.completedDeals === 1 ? "" : "s"}
                  </span>
                )}

                {!!responseLabel && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-800">
                    <Timer className="w-4 h-4 text-blue-700" />
                    {responseLabel}
                  </span>
                )}
              </div>

              {(publicStats.isTopProducer || publicStats.isFastResponder || publicStats.creci) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {publicStats.isTopProducer && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                      Top producer
                    </span>
                  )}
                  {publicStats.isFastResponder && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800 text-[11px] font-bold">
                      Responde rápido
                    </span>
                  )}
                  {publicStats.creci && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 bg-white text-gray-700 text-[11px] font-semibold">
                      CRECI {publicStats.creci}
                      {publicStats.creciState ? `/${publicStats.creciState}` : ""}
                    </span>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      <div className="p-6">
        <h3 className="text-base font-semibold text-gray-900">Fale com o anunciante</h3>

        <div className="mt-3">
          <button
            type="button"
            onClick={handleWhatsAppClick}
            disabled={!canUseWhatsAppAction || whatsAppLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white text-sm font-semibold px-4 py-3 shadow-sm hover:bg-[#128C7E] active:brightness-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
          >
            <WhatsAppIcon className="w-5 h-5" />
            {whatsAppLoading ? "Abrindo..." : "WhatsApp"}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-500">Ou</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-900">Use nosso chat</p>
          <p className="text-xs text-gray-600 mt-1">Envie mensagens e acompanhe a conversa aqui no site.</p>
          <button
            type="button"
            onClick={createLeadAndOpenChat}
            disabled={!!disableActions || chatLoading}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 text-white text-sm font-semibold px-4 py-3 shadow-sm hover:bg-teal-700 active:brightness-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
          >
            <MessageCircle className="w-5 h-5" />
            {chatLoading ? "Abrindo..." : "Chat"}
          </button>
        </div>
      </div>
    </div>
  );

}
