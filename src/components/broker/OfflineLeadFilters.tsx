"use client";

import type { OfflineLeadFilter } from "@/lib/offline-assistant-presentation";

type FilterOption = {
  value: OfflineLeadFilter;
  label: string;
  count: number;
  tone: "gray" | "rose" | "purple" | "amber" | "teal" | "emerald";
};

const TONE_ACTIVE: Record<FilterOption["tone"], string> = {
  gray: "bg-gray-900 text-white border-gray-900",
  rose: "bg-rose-600 text-white border-rose-600",
  purple: "bg-purple-600 text-white border-purple-600",
  amber: "bg-amber-600 text-white border-amber-600",
  teal: "bg-teal-600 text-white border-teal-600",
  emerald: "bg-emerald-600 text-white border-emerald-600",
};

const TONE_INACTIVE: Record<FilterOption["tone"], string> = {
  gray: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
  rose: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  purple: "border-purple-200 bg-white text-purple-700 hover:bg-purple-50",
  amber: "border-amber-200 bg-white text-amber-700 hover:bg-amber-50",
  teal: "border-teal-200 bg-white text-teal-700 hover:bg-teal-50",
  emerald: "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
};

interface OfflineLeadFiltersProps {
  value: OfflineLeadFilter;
  onChange: (next: OfflineLeadFilter) => void;
  counts: {
    total: number;
    urgent: number;
    visit: number;
    handoff: number;
    hot: number;
    qualified: number;
    failed: number;
  };
}

export default function OfflineLeadFilters({ value, onChange, counts }: OfflineLeadFiltersProps) {
  const options: FilterOption[] = [
    { value: "ALL", label: "Todos", count: counts.total, tone: "gray" },
    { value: "URGENT", label: "Urgentes", count: counts.urgent, tone: "rose" },
    { value: "VISIT", label: "Visita", count: counts.visit, tone: "purple" },
    { value: "HANDOFF", label: "Retorno", count: counts.handoff, tone: "amber" },
    { value: "HOT", label: "Quentes", count: counts.hot, tone: "teal" },
    { value: "QUALIFIED", label: "Qualificados", count: counts.qualified, tone: "emerald" },
    { value: "FAILED", label: "Falhou", count: counts.failed, tone: "rose" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtros de leads">
      {options.map((opt) => {
        const active = opt.value === value;
        const disabled = opt.value !== "ALL" && opt.count === 0;
        const className = active
          ? TONE_ACTIVE[opt.tone]
          : disabled
            ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
            : TONE_INACTIVE[opt.tone];

        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${className}`}
          >
            <span>{opt.label}</span>
            <span className={`tabular-nums ${active ? "text-white/90" : "text-current opacity-70"}`}>
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
