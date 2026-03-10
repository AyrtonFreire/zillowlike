"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import BrandLogo from "@/components/BrandLogo";
import { buildPropertyPath } from "@/lib/slug";
import { track } from "@/lib/analytics";
import RealtorReviewsSection from "@/components/realtor/RealtorReviewsSection";
import { MessageCircle, Phone, Copy, QrCode, ArrowRight, Check, Bed, Bath, Maximize, MapPin, ExternalLink, Sparkles } from "lucide-react";

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

type BriefObjective = "COMPRAR" | "ALUGAR";

type PriceRange = {
  key: string;
  label: string;
  min: number | null;
  max: number | null;
};

const PRICE_RANGES: PriceRange[] = [
  { key: "ate_300k", label: "Até R$ 300 mil", min: null, max: 300000 },
  { key: "300_600", label: "R$ 300–600 mil", min: 300000, max: 600000 },
  { key: "600_1m", label: "R$ 600 mil–1M", min: 600000, max: 1000000 },
  { key: "1m_plus", label: "R$ 1M+", min: 1000000, max: null },
  { key: "a_definir", label: "A definir", min: null, max: null },
];

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
  siteUrl,
  pageUrl,
  realtor,
  properties,
  initialRatingsPreview,
}: RealtorPublicLandingClientProps) {
  const [objective, setObjective] = useState<BriefObjective>("COMPRAR");
  const [region, setRegion] = useState<string>("");
  const [otherRegion, setOtherRegion] = useState<string>("");
  const [rangeKey, setRangeKey] = useState<string>(PRICE_RANGES[0]?.key || "ate_300k");

  const [tab, setTab] = useState<"featured" | "new" | "popular">("featured");
  const [filterBeds2, setFilterBeds2] = useState(false);
  const [filterParking, setFilterParking] = useState(false);
  const [filterPets, setFilterPets] = useState(false);
  const [priceMaxKey, setPriceMaxKey] = useState<"none" | "300k" | "600k" | "1000k">("none");

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

  const serviceAreaBriefOptions = useMemo(() => {
    return serviceAreaChips.slice(0, 10);
  }, [serviceAreaChips]);

  const selectedRegion = useMemo(() => {
    if (region === "__other__") {
      return otherRegion.trim() || "Outra região";
    }
    return region || serviceAreaBriefOptions[0] || "Região metropolitana";
  }, [otherRegion, region, serviceAreaBriefOptions]);

  const selectedRange = useMemo(() => {
    return PRICE_RANGES.find((r) => r.key === rangeKey) || PRICE_RANGES[0];
  }, [rangeKey]);

  const baseIntroMessage = useMemo(() => {
    return `Oi, vim do seu perfil no OggaHub. Quero ${objective === "COMPRAR" ? "comprar" : "alugar"} em ${selectedRegion}, faixa ${selectedRange?.label}. Pode me enviar opções?`;
  }, [objective, selectedRange?.label, selectedRegion]);

  const teamLabel = realtor.team?.name ? realtor.team.name : null;

  const heroChips = useMemo(() => {
    const chips: string[] = [];
    if (serviceAreaChips.length > 0) {
      chips.push(`Atendo: ${serviceAreaChips.slice(0, 3).join(" • ")}`);
    } else if (realtor.publicCity || realtor.publicState) {
      const loc = [realtor.publicCity, realtor.publicState].filter(Boolean).join("/");
      if (loc) chips.push(`Atendo: ${loc}`);
    } else {
      chips.push("Atendo: Região metropolitana");
    }

    chips.push(`Time com ${properties.length} imóveis ativos`);

    if (chips.length > 3) return chips.slice(0, 3);
    return chips;
  }, [properties.length, realtor.publicCity, realtor.publicState, serviceAreaChips]);

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

  const tabList = useMemo(() => {
    if (tab === "new") return newList;
    if (tab === "popular") return popularList;
    return featuredList;
  }, [featuredList, newList, popularList, tab]);

  const filteredTabList = useMemo(() => {
    const maxPrice =
      priceMaxKey === "300k" ? 300000 : priceMaxKey === "600k" ? 600000 : priceMaxKey === "1000k" ? 1000000 : null;

    return tabList.filter((p) => {
      if (filterBeds2 && (p.bedrooms == null || p.bedrooms < 2)) return false;
      if (filterParking && (p.parkingSpots == null || p.parkingSpots < 1)) return false;

      if (filterPets) {
        const ok = Boolean(p.petFriendly) || Boolean(p.petsSmall) || Boolean(p.petsLarge);
        if (!ok) return false;
      }

      if (maxPrice != null) {
        if (p.price == null) return false;
        const brl = p.price / 100;
        if (brl > maxPrice) return false;
      }

      return true;
    });
  }, [filterBeds2, filterParking, filterPets, priceMaxKey, tabList]);

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

  const briefRegions = useMemo(() => {
    const list = serviceAreaBriefOptions.length > 0 ? serviceAreaBriefOptions : ["Região metropolitana"];
    return [...list, "__other__"];
  }, [serviceAreaBriefOptions]);

  const heroTitle = "Encontre seu imóvel ideal com atendimento direto no WhatsApp";
  const heroSubtitle = "Me diga bairro + faixa de preço e eu te mando opções do nosso estoque.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <BrandLogo href="/" size={28} className="gap-2" wordmarkClassName="text-base font-semibold" />
          {whatsappDigits ? (
            <button
              type="button"
              onClick={() => handleWhatsApp(baseIntroMessage, "topbar")}
              className="hidden md:inline-flex items-center gap-2 rounded-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Falar no WhatsApp
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 md:pb-12">
        <section className="relative overflow-hidden rounded-3xl bg-brand-gradient text-white shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10" />
          <div className="relative px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  {realtor.image ? (
                    <Image
                      src={realtor.image}
                      alt={realtor.name}
                      width={96}
                      height={96}
                      className="h-20 w-20 md:h-24 md:w-24 rounded-2xl border-2 border-white/40 object-cover shadow-md bg-white/10"
                      priority
                    />
                  ) : (
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-white/15 flex items-center justify-center text-3xl md:text-4xl font-semibold shadow-md">
                      {(realtor.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{realtor.name}</h1>
                    {realtor.creci && realtor.creciState ? (
                      <span className="inline-flex items-center rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-50 border border-green-300/50">
                        {realtor.creci}/{realtor.creciState}
                      </span>
                    ) : null}
                    {teamLabel ? (
                      <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                        Corretor do time {teamLabel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                        Corretor no OggaHub
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-semibold leading-tight">{heroTitle}</div>
                    <div className="text-sm md:text-base text-white/85 mt-1">{heroSubtitle}</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {heroChips.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-white/90"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    {whatsappDigits ? (
                      <button
                        type="button"
                        onClick={() => handleWhatsApp(baseIntroMessage, "hero_primary")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-5 py-3 text-sm font-semibold transition-colors"
                      >
                        <Phone className="w-5 h-5" />
                        Quero receber opções no WhatsApp
                      </button>
                    ) : null}
                    <a
                      href="#imoveis"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-5 py-3 text-sm font-semibold border border-white/15 transition-colors"
                    >
                      Ver imóveis agora
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="hidden md:block w-full md:max-w-sm">
                <div className="rounded-2xl bg-white/10 border border-white/15 p-5">
                  <div className="text-sm font-semibold">Me diga o que você procura (leva 20s)</div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="text-xs text-white/80 font-semibold">Objetivo</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {([
                          { k: "COMPRAR", l: "Comprar" },
                          { k: "ALUGAR", l: "Alugar" },
                        ] as const).map((o) => (
                          <button
                            key={o.k}
                            type="button"
                            onClick={() => setObjective(o.k)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                              objective === o.k
                                ? "bg-white text-gray-900 border-white"
                                : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                            }`}
                          >
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-white/80 font-semibold">Região</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {briefRegions.slice(0, 7).map((r) => {
                          const isOther = r === "__other__";
                          const label = isOther ? "Outra região" : r;
                          const active = region === r || (!region && !isOther && r === serviceAreaBriefOptions[0]);
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRegion(r)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                active
                                  ? "bg-white text-gray-900 border-white"
                                  : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {region === "__other__" ? (
                        <input
                          value={otherRegion}
                          onChange={(e) => setOtherRegion(e.target.value)}
                          placeholder="Digite a região"
                          className="mt-2 w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/40"
                        />
                      ) : null}
                    </div>

                    <div>
                      <div className="text-xs text-white/80 font-semibold">Faixa</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {PRICE_RANGES.map((r) => (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => setRangeKey(r.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                              rangeKey === r.key
                                ? "bg-white text-gray-900 border-white"
                                : "bg-white/10 text-white border-white/20 hover:bg-white/15"
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {whatsappDigits ? (
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            track({
                              name: "public_profile_brief_submit",
                              payload: {
                                objective,
                                region: selectedRegion,
                                range: selectedRange?.key,
                              },
                            } as any);
                          } catch {}
                          handleWhatsApp(baseIntroMessage, "brief_submit");
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-semibold transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Enviar no WhatsApp
                      </button>
                    ) : (
                      <div className="text-xs text-white/80">WhatsApp não configurado.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 md:hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-base font-semibold text-gray-900">Me diga o que você procura (leva 20s)</div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-500">Objetivo</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  { k: "COMPRAR", l: "Comprar" },
                  { k: "ALUGAR", l: "Alugar" },
                ] as const).map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setObjective(o.k)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      objective === o.k
                        ? "border-teal-500 bg-teal-50 text-teal-800"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500">Região</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {briefRegions.map((r) => {
                  const isOther = r === "__other__";
                  const label = isOther ? "Outra região" : r;
                  const active = region === r || (!region && !isOther && r === serviceAreaBriefOptions[0]);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegion(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? "border-teal-500 bg-teal-50 text-teal-800"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {region === "__other__" ? (
                <input
                  value={otherRegion}
                  onChange={(e) => setOtherRegion(e.target.value)}
                  placeholder="Digite a região"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-200"
                />
              ) : null}
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500">Faixa</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRICE_RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRangeKey(r.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      rangeKey === r.key
                        ? "border-teal-500 bg-teal-50 text-teal-800"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {whatsappDigits ? (
              <button
                type="button"
                onClick={() => {
                  try {
                    track({
                      name: "public_profile_brief_submit",
                      payload: {
                        objective,
                        region: selectedRegion,
                        range: selectedRange?.key,
                      },
                    } as any);
                  } catch {}
                  handleWhatsApp(baseIntroMessage, "brief_submit");
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar no WhatsApp
              </button>
            ) : null}
          </div>
        </section>

        <section id="imoveis" className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-gray-900">Imóveis do time</div>
              <div className="text-sm text-gray-500 mt-1">
                {filteredTabList.length} resultado{filteredTabList.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                { k: "featured", l: "Destaques" },
                { k: "new", l: "Novidades" },
                { k: "popular", l: "Mais procurados" },
              ] as const).map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => {
                    setTab(t.k);
                    try {
                      track({ name: "public_profile_tab_change", value: t.k } as any);
                    } catch {}
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                    tab === t.k
                      ? "border-teal-500 bg-teal-50 text-teal-800"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterBeds2((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filterBeds2 ? "border-teal-500 bg-teal-50 text-teal-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              2+ quartos
            </button>
            <button
              type="button"
              onClick={() => setFilterParking((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filterParking ? "border-teal-500 bg-teal-50 text-teal-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Com vaga
            </button>
            <button
              type="button"
              onClick={() => setFilterPets((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filterPets ? "border-teal-500 bg-teal-50 text-teal-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Aceita pet
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Até R$</span>
              {([
                { k: "none", l: "—" },
                { k: "300k", l: "300 mil" },
                { k: "600k", l: "600 mil" },
                { k: "1000k", l: "1M" },
              ] as const).map((p) => (
                <button
                  key={p.k}
                  type="button"
                  onClick={() => setPriceMaxKey(p.k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    priceMaxKey === p.k
                      ? "border-teal-500 bg-teal-50 text-teal-800"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {p.l}
                </button>
              ))}
            </div>
          </div>

          {properties.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Estamos preparando os imóveis do time para aparecer aqui.</div>
              <div className="text-sm text-gray-600 mt-1">Volte em breve para ver as novidades.</div>
            </div>
          ) : filteredTabList.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Nenhum imóvel encontrado com os filtros atuais.</div>
              <div className="text-sm text-gray-600 mt-1">Tente remover algum filtro para ver mais opções.</div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTabList.map((p, idx) => (
                <TeamPropertyCard
                  key={p.id}
                  property={p}
                  siteUrl={siteUrl}
                  onWhatsApp={(message) => handleWhatsApp(message, "property_card", { propertyId: p.id })}
                  priority={idx < 3}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-gray-900">Por que comprar/alugar comigo</div>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-teal-600">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span>Curadoria rápida do estoque do time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-teal-600">
                    <Check className="w-4 h-4" />
                  </span>
                  <span>Apoio com documentação e visita</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-teal-600">
                    <Check className="w-4 h-4" />
                  </span>
                  <span>Negociação com transparência</span>
                </li>
              </ul>

              {whatsappDigits ? (
                <button
                  type="button"
                  onClick={() => handleWhatsApp(baseIntroMessage, "trust_section")}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar no WhatsApp
                </button>
              ) : null}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Sobre</div>
                  <div className="text-sm text-gray-500 mt-1">Curto e direto para compartilhar</div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3">
                {realtor.image ? (
                  <Image
                    src={realtor.image}
                    alt={realtor.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-xl object-cover border border-gray-200"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center font-semibold text-gray-700">
                    {(realtor.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{realtor.name}</div>
                  {teamLabel ? <div className="text-xs text-gray-500 truncate">Time {teamLabel}</div> : null}
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-700 whitespace-pre-line">
                {realtor.publicBio ? realtor.publicBio : "Este profissional ainda não preencheu uma bio pública."}
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500">Áreas atendidas</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(serviceAreaChips.length > 0 ? serviceAreaChips : ["Região metropolitana"]).slice(0, 10).map((a) => (
                    <span key={a} className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700">
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
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
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-gray-900">Compartilhar</div>
              <div className="text-sm text-gray-500 mt-1">Use esse link nas redes sociais e no WhatsApp.</div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Copiar link
                  </span>
                  {copiedLink ? <span className="text-teal-700">Copiado</span> : null}
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Copiar texto pronto
                  </span>
                  {copiedText ? <span className="text-teal-700">Copiado</span> : null}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="inline-flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    Baixar QR Code
                  </span>
                </button>
              </div>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {initialRatingsPreview.length > 0 ? (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Avaliações</div>
                    <div className="text-sm text-gray-500 mt-1">O que clientes dizem</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllReviews((v) => !v)}
                    className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {showAllReviews ? "Fechar" : "Ver todas"}
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {initialRatingsPreview.slice(0, 3).map((r) => (
                    <div key={r.id} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
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
              </section>
            ) : null}
          </div>
        </section>
      </main>

      {whatsappDigits ? (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] p-3 bg-white/80 backdrop-blur border-t border-gray-200">
          <button
            type="button"
            onClick={() => handleWhatsApp(baseIntroMessage, "sticky_mobile")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp — Receber opções
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TeamPropertyCard({
  property,
  siteUrl,
  onWhatsApp,
  priority,
}: {
  property: PublicProperty;
  siteUrl: string;
  onWhatsApp: (message: string) => void;
  priority: boolean;
}) {
  const href = buildPropertyPath(property.id, property.title);
  const imageUrl = property.images?.[0]?.url || null;

  const priceLabel = formatBRL(property.price);
  const locationLabel = property.neighborhood ? `${property.neighborhood}, ${property.city}/${property.state}` : `${property.city}/${property.state}`;

  const fullUrl = `${siteUrl.replace(/\/$/, "")}${href}`;
  const waMessage = `Tenho interesse neste imóvel: ${property.title}. Link: ${fullUrl}`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <Link
        href={href}
        className="block"
        onClick={() => {
          try {
            track({ name: "listing_click", payload: { propertyId: property.id } } as any);
          } catch {}
        }}
      >
        <div className="relative aspect-[4/3] bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={property.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="absolute inset-0 w-full h-full object-cover"
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center text-gray-400">
              <MapPin className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="text-lg font-semibold text-gray-900">{priceLabel}</div>
          <div className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">{property.title}</div>
          <div className="mt-1 text-xs text-gray-500 line-clamp-1">{locationLabel}</div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            {property.bedrooms != null ? (
              <span className="inline-flex items-center gap-1">
                <Bed className="w-4 h-4" />
                {property.bedrooms}
              </span>
            ) : null}
            {property.bathrooms != null ? (
              <span className="inline-flex items-center gap-1">
                <Bath className="w-4 h-4" />
                {Number(property.bathrooms)}
              </span>
            ) : null}
            {property.areaM2 != null ? (
              <span className="inline-flex items-center gap-1">
                <Maximize className="w-4 h-4" />
                {property.areaM2} m²
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onWhatsApp(waMessage)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm font-semibold transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Perguntar
        </button>
        <Link
          href={href}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 px-3 py-2 text-sm font-semibold transition-colors"
        >
          Ver detalhes
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
