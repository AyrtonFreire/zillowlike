"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface BrokerEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  tone?: "teal" | "slate" | "amber";
  compact?: boolean;
}

const TONES = {
  teal: { bg: "bg-teal-50", text: "text-teal-700", btn: "bg-teal-600 hover:bg-teal-700" },
  slate: { bg: "bg-slate-50", text: "text-slate-700", btn: "bg-slate-900 hover:bg-slate-800" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", btn: "bg-amber-600 hover:bg-amber-700" },
} as const;

export default function BrokerEmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  tone = "teal",
  compact = false,
}: BrokerEmptyStateProps) {
  const accent = TONES[tone];

  return (
    <div
      className={`rounded-3xl border border-gray-200 bg-white text-center ${
        compact ? "px-5 py-8" : "px-6 py-12 sm:py-16"
      }`}
    >
      <div className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl ${accent.bg} ${accent.text}`}>
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">{description}</p>
      {ctaLabel && ctaHref ? (
        <div className="mt-5">
          <Link
            href={ctaHref}
            className={`inline-flex items-center gap-2 rounded-xl ${accent.btn} px-4 py-2.5 text-sm font-semibold text-white transition`}
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
