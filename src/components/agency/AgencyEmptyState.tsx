"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface AgencyEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  tone?: "teal" | "slate";
}

export default function AgencyEmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  tone = "teal",
}: AgencyEmptyStateProps) {
  const accent =
    tone === "teal"
      ? { ring: "border-teal-200", bg: "bg-teal-50", text: "text-teal-700", btn: "bg-teal-600 hover:bg-teal-700" }
      : { ring: "border-slate-200", bg: "bg-slate-50", text: "text-slate-700", btn: "bg-slate-900 hover:bg-slate-800" };

  const button = ctaLabel ? (
    ctaHref ? (
      <Link
        href={ctaHref}
        className={`inline-flex items-center gap-2 rounded-xl ${accent.btn} px-4 py-2.5 text-sm font-semibold text-white transition`}
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    ) : (
      <button
        type="button"
        onClick={onCtaClick}
        className={`inline-flex items-center gap-2 rounded-xl ${accent.btn} px-4 py-2.5 text-sm font-semibold text-white transition`}
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    )
  ) : null;

  return (
    <div className={`rounded-3xl border ${accent.ring} bg-white p-8 text-center sm:p-12`}>
      <div className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl ${accent.bg} ${accent.text}`}>
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">{description}</p>
      {button ? <div className="mt-5">{button}</div> : null}
    </div>
  );
}
