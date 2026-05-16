"use client";

import { Star } from "lucide-react";
import RatingStars from "@/components/queue/RatingStars";
import type { RatingDistribution } from "@/lib/public-profile-viewmodel";
import ProfileReviewsDistribution from "./ProfileReviewsDistribution";

type RatingItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string | null;
  authorImage: string | null;
};

function toDateLabel(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export default function ProfileReviewsPreview({
  ratings,
  totalRatings,
  avgRating,
  distribution,
  reviewReplyRate,
  onOpenReviews,
}: {
  ratings: RatingItem[];
  totalRatings: number;
  avgRating: number;
  distribution: RatingDistribution;
  reviewReplyRate: number | null;
  onOpenReviews: () => void;
}) {
  const withComment = ratings.filter((r) => Boolean(r.comment && r.comment.trim())).slice(0, 3);
  if (totalRatings === 0 && withComment.length === 0) return null;

  const distributionTotal =
    distribution[5] + distribution[4] + distribution[3] + distribution[2] + distribution[1];

  return (
    <section className="scroll-mt-28 border-b border-slate-200 py-12" id="reviews">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-slate-950 sm:text-3xl">Avaliações</h2>
          {totalRatings > 0 ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="font-semibold text-slate-900">{avgRating.toFixed(1)}</span>
              <span className="text-slate-500">
                em {totalRatings} {totalRatings === 1 ? "avaliação" : "avaliações"}
              </span>
              {reviewReplyRate != null && reviewReplyRate >= 0.3 ? (
                <span className="ml-2 text-slate-400">
                  · responde {Math.round(reviewReplyRate * 100)}% das avaliações
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onOpenReviews}
          className="text-left text-sm font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline"
        >
          Ver todas
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_220px]">
        {withComment.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {withComment.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={onOpenReviews}
                className="rounded-3xl border border-slate-200 bg-white p-5 text-left transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      {item.authorName || "Cliente"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{toDateLabel(item.createdAt)}</div>
                  </div>
                  <RatingStars readonly rating={item.rating} size="sm" />
                </div>
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-700">
                  &ldquo;{item.comment}&rdquo;
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            As avaliações públicas aparecem aqui assim que os clientes deixarem feedback.
          </div>
        )}

        {distributionTotal > 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Distribuição
            </p>
            <div className="mt-4">
              <ProfileReviewsDistribution distribution={distribution} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
