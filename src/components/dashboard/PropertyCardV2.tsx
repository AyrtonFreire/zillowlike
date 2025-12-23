"use client";

import Image from "next/image";
import { Home, MapPin, Eye, Users, Target, Timer, Stars, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";

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
}

export default function PropertyCardV2({
  id,
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
  platformComparisonPct = null,
  timeseries14d = null,
  quickActions,
  favorites,
  qualityScore = 75,
  hasDescription = true,
  hasMinPhotos = true,
  missingFields = [],
}: PropertyCardV2Props) {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  const comparisonDelta = () => {
    if (platformComparisonPct === null || typeof platformComparisonPct === "undefined") return null;
    const delta = Math.round(platformComparisonPct - 100);
    return Number.isFinite(delta) ? delta : null;
  };

  const comparisonDeltaLabel = () => {
    const delta = comparisonDelta();
    if (delta === null) return "—";
    if (delta === 0) return "0%";
    return `${delta > 0 ? "+" : ""}${delta}%`;
  };

  const comparisonDeltaText = () => {
    const delta = comparisonDelta();
    if (delta === null) return "—";
    if (delta === 0) return "na média";
    return `${Math.abs(delta)}% ${delta > 0 ? "acima" : "abaixo"}`;
  };

  const comparisonTone = () => {
    const delta = comparisonDelta();
    if (delta === null) return "text-gray-700";
    if (delta >= 10) return "text-emerald-700";
    if (delta >= -10) return "text-amber-700";
    return "text-rose-700";
  };

  const comparisonBarPct = () => {
    if (platformComparisonPct === null || typeof platformComparisonPct === "undefined") return 0;
    const v = Math.max(0, Math.min(200, platformComparisonPct));
    return Math.round((v / 200) * 100);
  };

  const sparkline = useMemo(() => {
    const seriesViews = timeseries14d?.views;
    const seriesLeads = timeseries14d?.leads;
    if (!Array.isArray(seriesViews) || !Array.isArray(seriesLeads)) return null;
    const n = Math.min(seriesViews.length, seriesLeads.length);
    if (n < 2) return null;
    const maxVal = Math.max(1, ...seriesViews.slice(0, n), ...seriesLeads.slice(0, n));
    const w = 160;
    const h = 40;
    const pad = 3;
    const toPoints = (arr: number[]) => {
      const pts: string[] = [];
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * w;
        const v = Math.max(0, Number(arr[i]) || 0);
        const y = h - pad - (v / maxVal) * (h - pad * 2);
        pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }
      return pts.join(" ");
    };
    return {
      w,
      h,
      pointsViews: toPoints(seriesViews),
      pointsLeads: toPoints(seriesLeads),
    };
  }, [timeseries14d]);

  const handleToggleExpanded = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
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
          <div className="absolute top-3 left-3">{getStatusBadge()}</div>

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
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir
              </span>
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
              <div className="flex items-center gap-3 text-[13px] sm:text-sm text-gray-600">
                <div className="flex items-center gap-1" aria-label="Leads">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold tabular-nums">{leads}</span>
                </div>
                <div className="flex items-center gap-1" aria-label="Views">
                  <Eye className="w-4 h-4" />
                  <span className="font-semibold tabular-nums">{views}</span>
                </div>
              </div>
            </div>
          </div>
        </a>

        <button
          type="button"
          onClick={handleToggleExpanded}
          className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 text-left"
          aria-expanded={expanded}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-800">Métricas</div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {expanded ? (
          <div className="border-t border-gray-100 px-3 sm:px-4 py-3 sm:py-4 overflow-visible">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              {sparkline ? (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-semibold text-gray-800">Últimos 14 dias</div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        Views
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-teal-600" />
                        Leads
                      </span>
                    </div>
                  </div>
                  <svg width={sparkline.w} height={sparkline.h} viewBox={`0 0 ${sparkline.w} ${sparkline.h}`}>
                    <polyline
                      fill="none"
                      stroke="#9CA3AF"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={sparkline.pointsViews}
                    />
                    <polyline
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={sparkline.pointsLeads}
                    />
                  </svg>
                </div>
              ) : null}

              {(quickActions?.viewLeadsUrl || quickActions?.viewChatUrl || quickActions?.editUrl) ? (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                  <div className="text-xs font-semibold text-gray-800 mb-2">Ações rápidas</div>
                  <div className="flex flex-wrap gap-2">
                    {quickActions?.viewLeadsUrl ? (
                      <a
                        href={quickActions.viewLeadsUrl}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Ver leads
                      </a>
                    ) : null}
                    {quickActions?.viewChatUrl ? (
                      <a
                        href={quickActions.viewChatUrl}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Ver chat
                      </a>
                    ) : null}
                    {quickActions?.editUrl ? (
                      <a
                        href={quickActions.editUrl}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Editar
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm text-gray-800">
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

              <TooltipMetric
                id="avg"
                label="Média do site"
                title="Comparação com a média do site"
                description="Mostra quanto sua conversão (leads/views) está acima ou abaixo da média do site."
                example="+20% = 20% acima da média"
                isTapMode={isTapMode}
                activeTooltipId={activeTooltipId}
                setActiveTooltipId={setActiveTooltipId}
              >
                <>
                  <Stars className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className={`font-semibold tabular-nums ${comparisonTone()}`}>{comparisonDeltaLabel()}</span>
                </>
              </TooltipMetric>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-700 font-semibold">vs média do site</div>
                <div className={`font-semibold ${comparisonTone()}`}>{comparisonDeltaText()}</div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full ${comparisonTone().includes("emerald") ? "bg-emerald-500" : comparisonTone().includes("rose") ? "bg-rose-500" : "bg-amber-500"}`}
                  style={{ width: `${comparisonBarPct()}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">0% (0x) - 200% (2x)</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
