"use client";

import { ChevronRight, Star } from "lucide-react";
import type {
  PriceRangeVM,
  SignatureStatVM,
} from "@/lib/public-profile-viewmodel";

interface ProfileSignatureCardProps {
  priceRange: PriceRangeVM | null;
  stats: SignatureStatVM[];
  totalRatings: number;
  reviewsAction?: () => void;
}

const MAX_VISIBLE_STATS = 3;

export default function ProfileSignatureCard({
  priceRange,
  stats,
  totalRatings,
  reviewsAction,
}: ProfileSignatureCardProps) {
  const visibleStats = stats.slice(0, MAX_VISIBLE_STATS);
  const hasReviews = totalRatings > 0;

  if (!priceRange && visibleStats.length === 0 && !hasReviews) {
    return null;
  }

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {priceRange ? (
        <div className="border-b border-slate-100 pb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Faixa de preço da carteira
          </p>
          <p className="mt-1 font-serif text-2xl text-slate-950">{priceRange.label}</p>
        </div>
      ) : null}

      {visibleStats.length > 0 ? (
        <dl
          className={`grid gap-4 ${priceRange ? "pt-4" : ""} ${
            visibleStats.length === 1
              ? "grid-cols-1"
              : visibleStats.length === 2
                ? "grid-cols-2"
                : "grid-cols-3"
          }`}
        >
          {visibleStats.map((stat) => (
            <div key={stat.key}>
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
                {stat.label}
              </dt>
              <dd className="mt-1 flex items-baseline gap-1 font-serif text-xl text-slate-950">
                {stat.key === "rating" ? (
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                ) : null}
                <span>{stat.value}</span>
              </dd>
              {stat.helper ? (
                <p className="mt-0.5 text-[11px] text-slate-500">{stat.helper}</p>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}

      {hasReviews && reviewsAction ? (
        <button
          type="button"
          onClick={reviewsAction}
          className="mt-5 flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
        >
          <span>
            Ver {totalRatings === 1 ? "1 avaliação" : `${totalRatings} avaliações`}
          </span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </aside>
  );
}
