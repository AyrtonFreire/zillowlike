"use client";

import Image from "next/image";
import { Home, MapPin, Eye, Users, Target, Timer, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { formatPublicCode } from "@/lib/public-code";

function TooltipMetric({
  id,
  label,
  title,
  description,
  example,
  children,
  isTapMode,
  activeTooltipId,
  setActiveTooltipId,
}: {
  id: string;
  label: string;
  title: string;
  description: string;
  example?: string;
  children: ReactNode;
  isTapMode: boolean;
  activeTooltipId: string | null;
  setActiveTooltipId: (next: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isOpen = activeTooltipId === id;

  useEffect(() => {
    if (!isOpen) return;

    const onDocPointerDown = (e: Event) => {
      const el = ref.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (el.contains(target)) return;
      setActiveTooltipId(null);
    };

    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [isOpen, setActiveTooltipId]);

  const tooltipVisible = isOpen;

  const handleToggleTap = (e: PointerEvent | MouseEvent) => {
    if (!isTapMode) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveTooltipId(isOpen ? null : id);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (!isTapMode) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveTooltipId(isOpen ? null : id);
  };

  return (
    <div
      ref={ref}
      className="flex items-center gap-1.5 min-w-0 relative group/tt outline-none"
      tabIndex={0}
      title={title}
      aria-label={`${title}. ${description}${example ? ` Exemplo: ${example}` : ""}`}
      role="group"
      onPointerDown={handleToggleTap}
      onClick={handleToggleTap}
      onKeyDown={handleKeyDown}
    >
      {children}
      <div
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 shadow-lg z-50 ${
          tooltipVisible ? "block" : "hidden"
        } group-hover/tt:block group-focus/tt:block`}
      >
        <div className="font-semibold text-gray-900 mb-0.5">{label}</div>
        <div>{description}</div>
        {example ? <div className="mt-1 text-gray-600">Ex: {example}</div> : null}
      </div>
    </div>
  );
}

interface PropertyCardV2Props {
  id: string;
  publicCode?: string | null;
  href: string;
  title: string;
  price: number;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  image: string | null;
  street?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaM2?: number | null;
  type?: string;
  views: number;
  leads: number;
  conversionRatePct?: number | null;
  daysSinceLastLead?: number | null;
  platformComparisonPct?: number | null;
  timeseries14d?: {
    days: string[];
    views: number[];
    leads: number[];
  } | null;
  quickActions?: {
    viewLeadsUrl?: string;
    viewChatUrl?: string;
    editUrl?: string;
  };
  favorites?: number;
  qualityScore?: number; // 0-100
  hasDescription?: boolean;
  hasMinPhotos?: boolean;
  missingFields?: string[];
  badges?: Array<{ label: string; tone?: "info" | "warning" | "critical" }>;
}

export default function PropertyCardV2({
  id,
  publicCode = null,
  href,
  title,
  price,
  status,
  image,
  street,
  neighborhood,
  city,
  state,
  bedrooms,
  bathrooms,
  areaM2,
  type,
  views,
  leads,
  conversionRatePct = null,
  daysSinceLastLead = null,
  favorites,
  qualityScore = 75,
  hasDescription = true,
  hasMinPhotos = true,
  missingFields = [],
  badges = [],
}: PropertyCardV2Props) {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  const displayId = useMemo(() => {
    const code = publicCode ? formatPublicCode(String(publicCode)) : "";
    if (code) return code;
    const s = String(id || "");
    return s.length <= 8 ? s : s.slice(-8);
  }, [id, publicCode]);

  const copyId = useMemo(() => {
    const code = publicCode ? formatPublicCode(String(publicCode)) : "";
    return code || String(id || "");
  }, [id, publicCode]);

  const isTapMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    } catch {
      return false;
    }
  }, []);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getStatusBadge = () => {
    const styles = {
      ACTIVE: "bg-green-100 text-green-700 border-green-200",
      PAUSED: "bg-yellow-100 text-yellow-700 border-yellow-200",
      DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
    };
    const labels = {
      ACTIVE: "Ativo",
      PAUSED: "Pausado",
      DRAFT: "Rascunho",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getQualityColor = () => {
    if (qualityScore >= 80) return "text-green-600 bg-green-50";
    if (qualityScore >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const conversionLabel = () => {
    if (conversionRatePct === null || typeof conversionRatePct === "undefined") return "—";
    return `${conversionRatePct.toLocaleString("pt-BR")}%`;
  };

  const staleLabel = () => {
    if (daysSinceLastLead === null || typeof daysSinceLastLead === "undefined") return "—";
    if (daysSinceLastLead === 0) return "hoje";
    return `${daysSinceLastLead}d`;
  };

  const badgeStyle = (tone?: "info" | "warning" | "critical") => {
    const t = String(tone || "info").toLowerCase();
    if (t === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
    if (t === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-200 bg-slate-50 text-slate-700";
  };

  return (
    <div className="block group h-full">
      <div className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-all h-full flex flex-col overflow-visible">
        <a href={href} className="block">
          {/* Image Section */}
          <div className="relative aspect-[21/9] sm:aspect-[16/10] bg-gray-100 overflow-hidden rounded-t-2xl">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Home className="w-16 h-16" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
            {getStatusBadge()}
            {Array.isArray(badges) && badges.length > 0 ? (
              <div className="flex flex-col items-start gap-1">
                {badges.slice(0, 2).map((b, idx) => (
                  <span
                    key={`${b.label}-${idx}`}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyle(b.tone)}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Quality Score */}
          <div className="absolute top-3 right-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${getQualityColor()} backdrop-blur-sm`}>
              {qualityScore}% completo
            </div>
          </div>
          </div>

          {/* Compact Section */}
          <div className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[15px] sm:text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-teal-700 transition-colors">
                {title}
              </h3>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      void navigator.clipboard.writeText(copyId);
                    } catch {
                    }
                  }}
                  className="text-[11px] font-semibold text-gray-500 hover:text-gray-800"
                  title={copyId}
                >
                  {displayId}
                </button>
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir
                </span>
              </div>
            </div>

            <div className="flex items-start gap-1.5 text-[13px] sm:text-sm text-gray-600 mt-1">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
              <span className="line-clamp-2">
                {street && `${street}, `}
                {neighborhood && `${neighborhood}, `}
                {city}/{state}
              </span>
            </div>

            <div className="mt-2.5 sm:mt-3 flex items-end justify-between gap-3">
              <div className="text-xl sm:text-2xl font-extrabold text-teal-700 leading-none">{formatPrice(price)}</div>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-800">
              <TooltipMetric
                id="views"
                label="Views"
                title="Views (visualizações)"
                description="Quantidade de vezes que o anúncio foi visualizado."
                isTapMode={isTapMode}
                activeTooltipId={activeTooltipId}
                setActiveTooltipId={setActiveTooltipId}
              >
                <>
                  <Eye className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="font-semibold tabular-nums">{views}</span>
                </>
              </TooltipMetric>

              <TooltipMetric
                id="leads"
                label="Leads"
                title="Leads (contatos)"
                description="Quantidade de pessoas que enviaram contato/interesse por este imóvel."
                isTapMode={isTapMode}
                activeTooltipId={activeTooltipId}
                setActiveTooltipId={setActiveTooltipId}
              >
                <>
                  <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="font-semibold tabular-nums">{leads}</span>
                </>
              </TooltipMetric>

              <TooltipMetric
                id="conversion"
                label="Conversão"
                title="Conversão (leads/views)"
                description="Percentual de visualizações que viraram lead."
                example="2 leads / 100 views = 2%"
                isTapMode={isTapMode}
                activeTooltipId={activeTooltipId}
                setActiveTooltipId={setActiveTooltipId}
              >
                <>
                  <Target className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="font-semibold tabular-nums">{conversionLabel()}</span>
                </>
              </TooltipMetric>

              <TooltipMetric
                id="stale"
                label="Tempo sem lead"
                title="Tempo sem gerar lead"
                description="Dias desde o último lead. Se nunca teve lead, conta desde a criação do anúncio."
                example="10d = 10 dias sem lead"
                isTapMode={isTapMode}
                activeTooltipId={activeTooltipId}
                setActiveTooltipId={setActiveTooltipId}
              >
                <>
                  <Timer className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="font-semibold tabular-nums">{staleLabel()}</span>
                </>
              </TooltipMetric>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
