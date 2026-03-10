"use client";

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import BrandLogo from "@/components/BrandLogo";
import { buildPropertyPath } from "@/lib/slug";
import { track } from "@/lib/analytics";
import RealtorReviewsSection from "@/components/realtor/RealtorReviewsSection";
import {
  BadgeDollarSign,
  BedDouble,
  Copy,
  Grid3X3,
  Info,
  MapPin,
  MessageCircle,
  PawPrint,
  QrCode,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

type PublicProperty = {
  id: string;
  title: string;
  price: number | null;
  city: string;
  state: string;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  parkingSpots: number | null;
  petFriendly: boolean | null;
  petsSmall: boolean | null;
  petsLarge: boolean | null;
  conditionTags: string[];
  createdAt: string;
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
    image: string | null;
    publicHeadline: string | null;
    publicBio: string | null;
    publicCity: string | null;
    publicState: string | null;
    publicServiceAreas: string[];
    publicWhatsApp: string | null;
    publicPhoneOptIn: boolean;
    phone: string | null;
    instagram: string | null;
    linkedin: string | null;
    avgRating: number;
    totalRatings: number;
    team: { id: string; name: string } | null;
    creci: string | null;
    creciState: string | null;
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
};

const DEFAULT_PAGE_SIZE = 36;

function formatBRL(valueCents: number | null) {
  if (!valueCents || valueCents <= 0) return "Consulte";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valueCents / 100);
  } catch {
    return `R$ ${(valueCents / 100).toFixed(0)}`;
  }
}

function normalizePhone(value: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || null;
}

function buildWhatsAppUrl(phoneDigits: string, message: string) {
  const base = `https://wa.me/${phoneDigits}`;
  const text = encodeURIComponent(message);
  return `${base}?text=${text}`;
}

function toDateLabel(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export default function RealtorPublicLandingClient({
  siteUrl: _siteUrl,
  pageUrl,
  realtor,
  properties,
  initialRatingsPreview,
}: RealtorPublicLandingClientProps) {
  const [highlight, setHighlight] = useState<string>("featured");
  const [visibleCount, setVisibleCount] = useState(DEFAULT_PAGE_SIZE);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const [showAllReviews, setShowAllReviews] = useState(false);

  const whatsappDigits = useMemo(() => {
    const wa = normalizePhone(realtor.publicWhatsApp);
    if (wa) return wa;
    if (realtor.publicPhoneOptIn) {
      const phone = normalizePhone(realtor.phone);
      if (phone) return phone;
    }
    return null;
  }, [realtor.phone, realtor.publicPhoneOptIn, realtor.publicWhatsApp]);

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

  const teamLabel = realtor.team?.name ? realtor.team.name : null;

  const isFeatured = (p: PublicProperty) => Array.isArray(p.conditionTags) && p.conditionTags.includes("Destaque");
  const isPetsOk = (p: PublicProperty) => Boolean(p.petFriendly) || Boolean(p.petsSmall) || Boolean(p.petsLarge);
  const isNew = (p: PublicProperty) => {
    const created = new Date(p.createdAt);
    if (Number.isNaN(created.getTime())) return false;
    const days = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 14;
  };

  const featuredList = useMemo(() => {
    const tagged = properties.filter((p) => Array.isArray(p.conditionTags) && p.conditionTags.includes("Destaque"));
    if (tagged.length > 0) return tagged;
    const sorted = [...properties].sort((a, b) => {
      const dl = (b.leadsCount || 0) - (a.leadsCount || 0);
      if (dl !== 0) return dl;
      const dv = (b.viewsCount || 0) - (a.viewsCount || 0);
      if (dv !== 0) return dv;
      return b.createdAt.localeCompare(a.createdAt);
    });
    return sorted.slice(0, 24);
  }, [properties]);

  const newList = useMemo(() => {
    return [...properties].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [properties]);

  const popularList = useMemo(() => {
    return [...properties].sort((a, b) => {
      const dl = (b.leadsCount || 0) - (a.leadsCount || 0);
      if (dl !== 0) return dl;
      const dv = (b.viewsCount || 0) - (a.viewsCount || 0);
      if (dv !== 0) return dv;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [properties]);

  const neighborhoodHighlights = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of properties) {
      const nb = String(p.neighborhood || "").trim();
      if (!nb) continue;
      counts.set(nb, (counts.get(nb) || 0) + 1);
    }
    const list = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nb, c]) => ({ key: `nb:${nb}`, label: nb, count: c }));
    return list;
  }, [properties]);

  const highlights = useMemo(() => {
    const base: Array<{ key: string; label: string; icon: ReactNode }> = [
      { key: "featured", label: "Destaques", icon: <Sparkles className="h-5 w-5" /> },
      { key: "new", label: "Novos", icon: <Info className="h-5 w-5" /> },
      { key: "popular", label: "Procurados", icon: <TrendingUp className="h-5 w-5" /> },
      { key: "pets", label: "Pet", icon: <PawPrint className="h-5 w-5" /> },
      { key: "beds2", label: "2+ quartos", icon: <BedDouble className="h-5 w-5" /> },
      { key: "upto600k", label: "Até 600k", icon: <BadgeDollarSign className="h-5 w-5" /> },
    ];

    const neighborhoods = neighborhoodHighlights.map((h) => ({
      key: h.key,
      label: h.label,
      icon: <MapPin className="h-5 w-5" />,
    }));

    return [...base, ...neighborhoods];
  }, [neighborhoodHighlights]);

  const highlightList = useMemo(() => {
    if (highlight === "new") return newList;
    if (highlight === "popular") return popularList;
    if (highlight === "pets") return popularList.filter(isPetsOk);
    if (highlight === "beds2") return popularList.filter((p) => p.bedrooms != null && p.bedrooms >= 2);
    if (highlight === "upto600k")
      return popularList.filter((p) => (p.price != null ? p.price / 100 <= 600000 : false));
    if (highlight.startsWith("nb:")) {
      const nb = highlight.slice(3);
      return newList.filter((p) => String(p.neighborhood || "").trim() === nb);
    }
    return featuredList;
  }, [featuredList, highlight, newList, popularList]);

  const visibleList = useMemo(() => {
    return highlightList.slice(0, visibleCount);
  }, [highlightList, visibleCount]);

  const canLoadMore = visibleCount < highlightList.length;

  const handleWhatsApp = (message: string, action: string, payload?: Record<string, any>) => {
    if (!whatsappDigits) return;
    try {
      track({ name: "whatsapp_click", payload: { action, ...payload } } as any);
    } catch {}
    window.open(buildWhatsAppUrl(whatsappDigits, message), "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {}
  };

  const handleCopyText = async () => {
    const text = `Olá! Se você está buscando imóvel para comprar/alugar, me chama aqui: ${pageUrl}. Eu te mando opções do nosso estoque no WhatsApp.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1500);
    } catch {}
  };

  const handleDownloadQr = () => {
    const url = `https://chart.googleapis.com/chart?chs=512x512&cht=qr&chl=${encodeURIComponent(pageUrl)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qrcode-${realtor.name || "perfil"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <BrandLogo href="/" size={26} className="gap-2" wordmarkClassName="text-base font-semibold" />
          {whatsappDigits ? (
            <button
              type="button"
              onClick={() => handleWhatsApp(baseIntroMessage, "topbar")}
              className="inline-flex items-center gap-2 rounded-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar mensagem
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-5xl pb-24 md:pb-12">
        <section className="px-4 pt-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="rounded-full p-[2px] bg-gradient-to-tr from-fuchsia-500 via-orange-400 to-yellow-300">
                <div className="rounded-full bg-white p-[2px]">
                  {realtor.image ? (
                    <Image
                      src={realtor.image}
                      alt={realtor.name}
                      width={88}
                      height={88}
                      className="h-[88px] w-[88px] rounded-full object-cover"
                      priority
                    />
                  ) : (
                    <div className="h-[88px] w-[88px] rounded-full bg-gray-100 flex items-center justify-center text-3xl font-semibold text-gray-700">
                      {(realtor.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{realtor.name}</h1>
                {realtor.creci && realtor.creciState ? (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
                    {realtor.creci}/{realtor.creciState}
                  </span>
                ) : null}
                {teamLabel ? (
                  <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
                    Time {teamLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-gray-200 bg-white py-2">
                  <div className="text-sm font-semibold text-gray-900">{properties.length}</div>
                  <div className="text-[11px] text-gray-500">imóveis</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white py-2">
                  <div className="text-sm font-semibold text-gray-900">{realtor.totalRatings}</div>
                  <div className="text-[11px] text-gray-500">avaliações</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white py-2">
                  <div className="text-sm font-semibold text-gray-900">
                    {realtor.avgRating > 0 ? realtor.avgRating.toFixed(1) : "—"}
                  </div>
                  <div className="text-[11px] text-gray-500">nota</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-900 whitespace-pre-line">
            {realtor.publicHeadline ? <div className="font-semibold">{realtor.publicHeadline}</div> : null}
            {realtor.publicBio ? <div className="text-gray-700">{realtor.publicBio}</div> : null}
            {locationLabel ? <div className="text-gray-500">{locationLabel}</div> : null}
            {serviceAreaChips.length > 0 ? (
              <div className="text-gray-500">Atendo: {serviceAreaChips.slice(0, 4).join(" • ")}</div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {whatsappDigits ? (
              <button
                type="button"
                onClick={() => handleWhatsApp(baseIntroMessage, "profile_primary")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar mensagem
              </button>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
                WhatsApp não configurado
              </div>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 transition-colors"
            >
              <Copy className="h-4 w-4" />
              {copiedLink ? "Copiado" : "Copiar link"}
            </button>
          </div>
        </section>

        <section className="mt-5 px-4">
          <div className="flex items-start gap-4 overflow-x-auto pb-2">
            {highlights.map((h) => {
              const active = h.key === highlight;
              return (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => {
                    setHighlight(h.key);
                    setVisibleCount(DEFAULT_PAGE_SIZE);
                    try {
                      track({ name: "public_profile_highlight", value: h.key } as any);
                    } catch {}
                  }}
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                  <div
                    className={`h-16 w-16 rounded-full border bg-white flex items-center justify-center text-gray-700 transition-colors ${
                      active ? "border-gray-900" : "border-gray-200"
                    }`}
                  >
                    {h.icon}
                  </div>
                  <div className={`text-[11px] font-semibold ${active ? "text-gray-900" : "text-gray-600"}`}>{h.label}</div>
                </button>
              );
            })}
          </div>
        </section>

        <nav className="sticky top-14 z-40 bg-white border-y border-gray-100">
          <div className="mx-auto max-w-5xl px-4 h-12 flex items-center justify-around">
            <a href="#grid" className="p-2 text-gray-900">
              <Grid3X3 className="h-5 w-5" />
            </a>
            <a href="#avaliacoes" className="p-2 text-gray-700">
              <Star className="h-5 w-5" />
            </a>
            <a href="#sobre" className="p-2 text-gray-700">
              <Info className="h-5 w-5" />
            </a>
          </div>
        </nav>

        <section id="grid" className="mt-0">
          {properties.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-sm font-semibold text-gray-900">Ainda não há imóveis disponíveis aqui.</div>
              <div className="text-sm text-gray-600 mt-1">Volte em breve para ver as novidades.</div>
            </div>
          ) : highlightList.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-sm font-semibold text-gray-900">Nenhum imóvel encontrado nesse destaque.</div>
              <div className="text-sm text-gray-600 mt-1">Tente outro highlight para ver mais opções.</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-[2px] bg-gray-200">
                {visibleList.map((p, idx) => (
                  <PropertyTile
                    key={p.id}
                    property={p}
                    priority={idx < 9}
                    badge={isFeatured(p) ? "Destaque" : isNew(p) ? "Novo" : null}
                  />
                ))}
              </div>
              {canLoadMore ? (
                <div className="px-4 py-6">
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleCount((v) => Math.min(v + DEFAULT_PAGE_SIZE, highlightList.length));
                      try {
                        track({ name: "public_profile_load_more", value: String(highlight) } as any);
                      } catch {}
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 transition-colors"
                  >
                    Carregar mais
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section id="avaliacoes" className="px-4 pt-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-gray-900">Avaliações</div>
              <div className="text-sm text-gray-500">O que clientes dizem</div>
            </div>
            {initialRatingsPreview.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllReviews((v) => !v)}
                className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {showAllReviews ? "Fechar" : "Ver todas"}
              </button>
            ) : null}
          </div>

          {initialRatingsPreview.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">Ainda não há avaliações publicadas.</div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {initialRatingsPreview.slice(0, 3).map((r) => (
                  <div key={r.id} className="rounded-2xl border border-gray-200 p-4 bg-white">
                    <div className="text-sm font-semibold text-gray-900 truncate">{r.authorName || "Cliente"}</div>
                    <div className="text-xs text-gray-500 mt-1">{toDateLabel(r.createdAt)}</div>
                    <div className="mt-2 text-xs font-semibold text-yellow-700">{`${r.rating}★`}</div>
                    {r.comment ? <div className="mt-2 text-sm text-gray-700 line-clamp-4">{r.comment}</div> : null}
                  </div>
                ))}
              </div>

              {showAllReviews ? (
                <div className="mt-6">
                  <RealtorReviewsSection realtorId={realtor.id} initialAvgRating={realtor.avgRating} initialTotalRatings={realtor.totalRatings} />
                </div>
              ) : null}
            </>
          )}
        </section>

        <section id="sobre" className="px-4 pt-10">
          <div className="text-base font-semibold text-gray-900">Sobre</div>
          <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              {realtor.image ? (
                <Image
                  src={realtor.image}
                  alt={realtor.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-semibold text-gray-700">
                  {(realtor.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{realtor.name}</div>
                {teamLabel ? <div className="text-xs text-gray-500 truncate">Time {teamLabel}</div> : null}
                {locationLabel ? <div className="text-xs text-gray-500 truncate">{locationLabel}</div> : null}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-700 whitespace-pre-line">
              {realtor.publicBio ? realtor.publicBio : "Este profissional ainda não preencheu uma bio pública."}
            </div>

            {serviceAreaChips.length > 0 ? (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500">Áreas atendidas</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {serviceAreaChips.slice(0, 12).map((a) => (
                    <span key={a} className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {realtor.instagram ? (
                <a
                  href={`https://instagram.com/${realtor.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Instagram
                </a>
              ) : null}
              {realtor.linkedin ? (
                <a
                  href={realtor.linkedin.startsWith("http") ? realtor.linkedin : `https://linkedin.com/in/${realtor.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  LinkedIn
                </a>
              ) : null}
            </div>

            {whatsappDigits ? (
              <button
                type="button"
                onClick={() => handleWhatsApp(baseIntroMessage, "about_whatsapp")}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                Enviar mensagem
              </button>
            ) : null}
          </div>
        </section>

        <section id="compartilhar" className="px-4 pt-10">
          <div className="text-base font-semibold text-gray-900">Compartilhar</div>
          <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-sm text-gray-600">Use esse link nas redes sociais e no WhatsApp.</div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Copiar link
                </span>
                {copiedLink ? <span className="text-gray-900">Copiado</span> : null}
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Copiar texto pronto
                </span>
                {copiedText ? <span className="text-gray-900">Copiado</span> : null}
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="inline-flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Baixar QR Code
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {whatsappDigits ? (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] p-3 bg-white/90 backdrop-blur border-t border-gray-200">
          <button
            type="button"
            onClick={() => handleWhatsApp(baseIntroMessage, "sticky_mobile")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            Enviar mensagem
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PropertyTile({
  property,
  priority,
  badge,
}: {
  property: PublicProperty;
  priority: boolean;
  badge: string | null;
}) {
  const href = buildPropertyPath(property.id, property.title);
  const imageUrl = property.images?.[0]?.url || null;

  return (
    <Link
      href={href}
      className="relative aspect-square bg-white overflow-hidden"
      onClick={() => {
        try {
          track({ name: "listing_click", payload: { propertyId: property.id } } as any);
        } catch {}
      }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={property.title}
          fill
          sizes="(max-width: 768px) 33vw, 33vw"
          className="absolute inset-0 h-full w-full object-cover"
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 h-full w-full flex items-center justify-center text-gray-300 bg-gray-50">
          <MapPin className="h-7 w-7" />
        </div>
      )}

      {badge ? (
        <div className="absolute left-1 top-1 rounded-full bg-black/70 text-white text-[10px] font-semibold px-2 py-1">
          {badge}
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 via-black/10 to-transparent">
        <div className="text-[11px] font-semibold text-white truncate">{formatBRL(property.price)}</div>
        {property.neighborhood ? (
          <div className="text-[10px] text-white/90 truncate">{property.neighborhood}</div>
        ) : null}
      </div>
    </Link>
  );
}
