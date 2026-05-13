"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Accent = "none" | "rose" | "amber" | "emerald" | "teal";

interface BrokerMetricTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  href?: string;
  onClick?: () => void;
  accent?: Accent;
  className?: string;
}

const DOT_TONE: Record<Exclude<Accent, "none">, string> = {
  rose: "bg-rose-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
};

const BASE_CLASSES =
  "group flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2";

export default function BrokerMetricTile({
  icon: Icon,
  label,
  value,
  href,
  onClick,
  accent = "none",
  className = "",
}: BrokerMetricTileProps) {
  const showDot = value > 0 && accent !== "none";
  const numberClass = value === 0 ? "text-slate-500" : "text-slate-950";

  const content: ReactNode = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500 transition group-hover:bg-gray-100">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-6 flex items-baseline gap-2">
        <span className={`text-3xl font-semibold tabular-nums tracking-tight ${numberClass}`}>{value}</span>
        {showDot ? (
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_TONE[accent as Exclude<Accent, "none">]}`}
            aria-label="Requer atenção"
          />
        ) : null}
      </div>
      <div className="mt-1 text-sm font-medium text-gray-700">{label}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${BASE_CLASSES} ${className}`.trim()}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${BASE_CLASSES} ${className}`.trim()}>
      {content}
    </button>
  );
}
