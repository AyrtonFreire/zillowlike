"use client";

import { useEffect, useMemo, useState } from "react";
import { User, Building2, MessageCircle, ExternalLink, Timer } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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

type ContactCardProps = {
  propertyId: string;
  propertyTitle: string;
  propertyPurpose?: "SALE" | "RENT";
  disableActions?: boolean;
  
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
  ownerRole,
  ownerName,
  ownerImage,
  ownerPublicProfileEnabled,
  ownerPublicSlug,
  ownerPublicPhoneOptIn,
  hideOwnerContact,
}: ContactCardProps) {
  const [loading, setLoading] = useState(false);
  const [publicStatsLoading, setPublicStatsLoading] = useState(false);
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

  useEffect(() => {
    const slug = String(ownerPublicSlug || "").trim();
    if (!isRealtorOrAgency || !slug) {
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
  }, [isRealtorOrAgency, ownerPublicSlug]);

  const canShowWhatsApp = useMemo(() => {
    // Para corretores/imobiliárias: se houver opt-in no perfil, respeita; caso contrário, esconde.
    if (isRealtorOrAgency) return !!ownerPublicPhoneOptIn;
    if (hideOwnerContact) return false;
    // Para pessoa física: o controle é por imóvel (hideOwnerContact).
    return true;
  }, [hideOwnerContact, isRealtorOrAgency, ownerPublicPhoneOptIn]);

  const handleWhatsAppClick = async () => {
    try {
      if (disableActions) return;
      if (!canShowWhatsApp) {
        toast.info("Contato via WhatsApp não está disponível para este anúncio.");
        return;
      }

      const tryFetch = async (method: "GET" | "POST") => {
        const res = await fetch(`/api/properties/${propertyId}/whatsapp`, { method });
        const data = await res.json().catch(() => ({} as any));
        const url = data?.whatsappUrl as string | undefined;
        return { ok: res.ok, url };
      };

      const primary = await tryFetch("POST");
      const fallback = primary.ok && primary.url ? primary : await tryFetch("GET");

      if (!fallback.ok || !fallback.url) {
        toast.error("WhatsApp indisponível no momento.");
        return;
      }

      window.open(fallback.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("WhatsApp indisponível no momento.");
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

      setLoading(true);

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
      setLoading(false);
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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header: foto/logo do corretor/imobiliária (se aplicável) */}
      {isRealtorOrAgency && ownerName && (
        <div className="p-6 border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          <div className="flex items-start justify-between gap-3">
            {hasPublicProfile ? (
              <Link
                href={`/realtor/${ownerPublicSlug}`}
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
                  {(publicStats?.headline || (publicStats?.city && publicStats?.state)) && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {publicStats?.headline
                        ? publicStats.headline
                        : `${publicStats?.city}/${publicStats?.state}`}
                    </p>
                  )}
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

            {hasPublicProfile && (
              <Link
                href={`/realtor/${ownerPublicSlug}`}
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
                  hasPublicProfile ? (
                    <Link
                      href={`/realtor/${ownerPublicSlug}#anuncios`}
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
            disabled={!!disableActions || !canShowWhatsApp}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white text-sm font-semibold px-4 py-3 shadow-sm hover:bg-[#128C7E] active:brightness-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
          >
            <WhatsAppIcon className="w-5 h-5" />
            WhatsApp
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
            disabled={!!disableActions || loading}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 text-white text-sm font-semibold px-4 py-3 shadow-sm hover:bg-teal-700 active:brightness-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
          >
            <MessageCircle className="w-5 h-5" />
            {loading ? "Abrindo..." : "Chat"}
          </button>
        </div>
      </div>
    </div>
  );

}
