"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Star } from "lucide-react";
import RatingStars from "@/components/queue/RatingStars";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

type RatingItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  status?: string | null;
  replyText?: string | null;
  repliedAt?: string | null;
  author?: {
    name: string | null;
    image: string | null;
  } | null;
  lead?: {
    property?: {
      title: string | null;
    } | null;
  } | null;
};

type RatingsResponse = {
  ratings: RatingItem[];
  nextCursor: string | null;
  histogram: Record<string, number>;
  stats: {
    avgRating: number;
    totalRatings: number;
  };
};

type EligibilityResponse = {
  eligible: boolean;
  leadId: string | null;
  requiresLogin?: boolean;
};

type Props = {
  realtorId: string;
  initialAvgRating?: number;
  initialTotalRatings?: number;
};

function formatMonthYear(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export default function RealtorReviewsSection({ realtorId, initialAvgRating = 0, initialTotalRatings = 0 }: Props) {
  const toast = useToast();
  const { data: session } = useSession();
  const sessionUserId = (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub || null;
  const sessionRole = (session as any)?.user?.role || (session as any)?.role || null;
  const canSeeAll = Boolean(sessionUserId) && (sessionRole === "ADMIN" || sessionUserId === realtorId);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState(initialAvgRating);
  const [totalRatings, setTotalRatings] = useState(initialTotalRatings);
  const [histogram, setHistogram] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  const [filterStars, setFilterStars] = useState<number | null>(null);
  const [filterHasComment, setFilterHasComment] = useState(false);

  const [eligible, setEligible] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [eligibleLeadId, setEligibleLeadId] = useState<string | null>(null);

  const [writeOpen, setWriteOpen] = useState(false);
  const [draftStars, setDraftStars] = useState(0);
  const [draftComment, setDraftComment] = useState("");

  const [replyOpenForId, setReplyOpenForId] = useState<string | null>(null);
  const [draftReply, setDraftReply] = useState("");

  const ratingLabel = useMemo(() => {
    if (!totalRatings || avgRating <= 0) return "N/A";
    return avgRating.toFixed(1);
  }, [avgRating, totalRatings]);

  const histogramTotal = useMemo(() => {
    return [1, 2, 3, 4, 5].reduce((acc, k) => acc + (histogram[k] || 0), 0);
  }, [histogram]);

  const buildQuery = useCallback((cursor?: string | null) => {
    const sp = new URLSearchParams();
    sp.set("realtorId", realtorId);
    sp.set("take", "10");
    if (filterStars) sp.set("stars", String(filterStars));
    if (filterHasComment) sp.set("hasComment", "1");
    if (canSeeAll) sp.set("includeAll", "1");
    if (cursor) sp.set("cursor", cursor);
    return sp.toString();
  }, [filterHasComment, filterStars, realtorId, canSeeAll]);

  const fetchEligibility = useCallback(async () => {
    try {
      const res = await fetch(`/api/ratings/eligibility?realtorId=${encodeURIComponent(realtorId)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as EligibilityResponse | null;
      if (!res.ok || !data) {
        setEligible(false);
        setEligibleLeadId(null);
        setRequiresLogin(false);
        return;
      }
      setEligible(Boolean(data.eligible));
      setEligibleLeadId(data.leadId || null);
      setRequiresLogin(Boolean(data.requiresLogin));
    } catch {
      setEligible(false);
      setEligibleLeadId(null);
      setRequiresLogin(false);
    }
  }, [realtorId]);

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ratings?${buildQuery(null)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as RatingsResponse | null;
      if (!res.ok || !data) {
        setRatings([]);
        setNextCursor(null);
        setHistogram({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
        setAvgRating(0);
        setTotalRatings(0);
        return;
      }
      setRatings(Array.isArray(data.ratings) ? data.ratings : []);
      setNextCursor(data.nextCursor || null);
      setAvgRating(Number(data.stats?.avgRating || 0));
      setTotalRatings(Number(data.stats?.totalRatings || 0));

      const nextHist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const src = (data.histogram || {}) as any;
      for (const k of [1, 2, 3, 4, 5]) {
        nextHist[k] = Number(src[String(k)] ?? src[k] ?? 0);
      }
      setHistogram(nextHist);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const fetchMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/ratings?${buildQuery(nextCursor)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as RatingsResponse | null;
      if (!res.ok || !data) {
        return;
      }
      setRatings((prev) => [...prev, ...(Array.isArray(data.ratings) ? data.ratings : [])]);
      setNextCursor(data.nextCursor || null);
    } finally {
      setLoadingMore(false);
    }
  }, [buildQuery, nextCursor]);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  useEffect(() => {
    setNextCursor(null);
    fetchRatings();
  }, [filterStars, filterHasComment, fetchRatings]);

  const openWrite = () => {
    setDraftStars(0);
    setDraftComment("");
    setWriteOpen(true);
  };

  const submitReview = async () => {
    if (!eligibleLeadId) {
      toast.error("Não foi possível avaliar", "Você não possui um lead elegível para avaliação.");
      return;
    }
    if (!draftStars || draftStars < 1 || draftStars > 5) {
      toast.error("Selecione as estrelas", "Escolha uma nota de 1 a 5.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leadId: eligibleLeadId,
          realtorId,
          rating: draftStars,
          comment: draftComment.trim() ? draftComment.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !(data?.success ?? true)) {
        toast.error("Não foi possível enviar", data?.message || data?.error || "Tente novamente.");
        return;
      }

      toast.success("Avaliação enviada", "Obrigado por compartilhar sua experiência.");
      setWriteOpen(false);
      await fetchRatings();
      await fetchEligibility();
    } catch {
      toast.error("Não foi possível enviar", "Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (ratingId: string) => {
    if (!draftReply.trim()) {
      toast.error("Digite uma resposta", "A resposta não pode ficar vazia.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ratingId, replyText: draftReply.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error("Não foi possível responder", data?.error || "Tente novamente.");
        return;
      }
      toast.success("Resposta enviada", "Sua resposta foi publicada.");
      setReplyOpenForId(null);
      setDraftReply("");
      await fetchRatings();
    } catch {
      toast.error("Não foi possível responder", "Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const reportReview = async (ratingId: string) => {
    const ok = await toast.confirm({
      title: "Denunciar avaliação",
      message: "Deseja denunciar esta avaliação para moderação?",
      confirmText: "Denunciar",
      cancelText: "Cancelar",
      variant: "warning",
    });
    if (!ok) return;

    try {
      const res = await fetch("/api/review-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType: "REALTOR", ratingId, reason: "OTHER" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error("Não foi possível denunciar", data?.error || "Tente novamente.");
        return;
      }
      toast.success("Denúncia enviada", "Obrigado por ajudar a manter a plataforma segura.");
    } catch {
      toast.error("Não foi possível denunciar", "Tente novamente.");
    }
  };

  const histogramRows = useMemo(() => {
    const denom = histogramTotal || totalRatings || 0;
    return [5, 4, 3, 2, 1].map((stars) => {
      const count = histogram[stars] || 0;
      const pct = denom > 0 ? Math.round((count / denom) * 100) : 0;
      return { stars, count, pct };
    });
  }, [histogram, histogramTotal, totalRatings]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Avaliações</h2>
          <p className="text-sm text-gray-500 mt-1">Somente avaliações de clientes que viraram lead.</p>
        </div>

        {requiresLogin ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => signIn(undefined, { callbackUrl: typeof window !== "undefined" ? window.location.href : undefined })}
          >
            Entrar para avaliar
          </Button>
        ) : eligible ? (
          <Button variant="primary" size="sm" onClick={openWrite}>
            Escrever avaliação
          </Button>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="flex items-end gap-3">
            <div className="text-4xl font-bold text-gray-900 leading-none">{ratingLabel}</div>
            <div className="pb-1">
              <RatingStars readonly rating={Math.round(avgRating)} size="sm" />
              <div className="text-xs text-gray-500 mt-1">{totalRatings} avaliação{totalRatings === 1 ? "" : "s"}</div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {histogramRows.map((row) => (
              <button
                key={`hist-${row.stars}`}
                type="button"
                onClick={() => setFilterStars((v) => (v === row.stars ? null : row.stars))}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className="w-10 text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <span>{row.stars}</span>
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${row.pct}%` }} />
                </div>
                <div className="w-10 text-right text-xs font-semibold text-gray-600">{row.count}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterStars(null)}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                filterStars == null ? "border-teal-500 bg-teal-50 text-teal-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Todas
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={`star-${s}`}
                type="button"
                onClick={() => setFilterStars((v) => (v === s ? null : s))}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                  filterStars === s ? "border-teal-500 bg-teal-50 text-teal-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s}★
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilterHasComment((v) => !v)}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                filterHasComment ? "border-teal-500 bg-teal-50 text-teal-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Com comentário
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`sk-${i}`} className="rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded mt-3" />
                  <div className="h-3 w-full bg-gray-200 rounded mt-4" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : ratings.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-700 font-medium">Ainda não há avaliações.</p>
              <p className="text-xs text-gray-500 mt-1">Se você já virou lead, você pode ser o primeiro a avaliar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((r) => {
                const authorName = r.author?.name || "Cliente";
                const propertyTitle = r.lead?.property?.title || null;
                const canReply = canSeeAll;
                return (
                  <div key={r.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">{authorName}</span>
                          <span className="text-xs text-gray-400">{formatMonthYear(r.createdAt)}</span>
                        </div>
                        {propertyTitle && (
                          <div className="text-xs text-gray-500 mt-1 truncate">{propertyTitle}</div>
                        )}
                      </div>
                      <RatingStars readonly rating={r.rating} size="sm" />
                    </div>
                    {r.comment && (
                      <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">{r.comment}</p>
                    )}

                    {r.replyText && (
                      <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
                        <div className="text-xs font-semibold text-gray-700">Resposta do profissional</div>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{r.replyText}</p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => reportReview(r.id)}
                        className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Denunciar
                      </button>

                      {canReply && (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyOpenForId((prev) => (prev === r.id ? null : r.id));
                            setDraftReply(r.replyText || "");
                          }}
                          className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {r.replyText ? "Editar resposta" : "Responder"}
                        </button>
                      )}
                    </div>

                    {canReply && replyOpenForId === r.id && (
                      <div className="mt-3">
                        <textarea
                          value={draftReply}
                          onChange={(e) => setDraftReply(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-200"
                          placeholder="Escreva uma resposta pública..."
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => {
                              setReplyOpenForId(null);
                              setDraftReply("");
                            }}
                            disabled={submitting}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="primary"
                            size="md"
                            onClick={() => submitReply(r.id)}
                            loading={submitting}
                          >
                            Salvar resposta
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {nextCursor && (
                <div className="pt-2">
                  <Button variant="ghost" size="md" loading={loadingMore} onClick={fetchMore} className="w-full">
                    Ver mais avaliações
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {writeOpen && (
        <div className="fixed inset-0 z-[60001] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && setWriteOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Escrever avaliação</h3>
                  <p className="text-sm text-gray-500 mt-1">Sua avaliação ficará pública no perfil.</p>
                </div>
                <button
                  type="button"
                  onClick={() => !submitting && setWriteOpen(false)}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5">
                <div className="text-sm font-semibold text-gray-900 mb-2">Nota</div>
                <RatingStars rating={draftStars} onRate={setDraftStars} size="lg" />
              </div>

              <div className="mt-5">
                <label className="text-sm font-semibold text-gray-900" htmlFor="review-comment">
                  Comentário (opcional)
                </label>
                <textarea
                  id="review-comment"
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-200"
                  placeholder="Conte como foi sua experiência..."
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <Button variant="ghost" size="md" onClick={() => setWriteOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button variant="primary" size="md" onClick={submitReview} loading={submitting}>
                Enviar avaliação
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
