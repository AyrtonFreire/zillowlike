"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Star } from "lucide-react";
import Image from "next/image";
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
  reason?: string | null;
  nextEligibleAt?: string | null;
  existingRating?: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
};

type Props = {
  realtorId: string;
  initialAvgRating?: number;
  initialTotalRatings?: number;
  embedded?: boolean;
  variant?: "default" | "google";
};

function formatMonthYear(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function formatRelativeDate(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

type SortOption = "relevant" | "newest" | "highest" | "lowest";

export default function RealtorReviewsSection({ realtorId, initialAvgRating = 0, initialTotalRatings = 0, embedded = false, variant = "default" }: Props) {
  const toast = useToast();
  const { data: session } = useSession();
  const sessionUserId = (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub || null;
  const sessionRole = (session as any)?.user?.role || (session as any)?.role || null;
  const canSeeAll = Boolean(sessionUserId) && (sessionRole === "ADMIN" || sessionUserId === realtorId);

  const isGoogle = variant === "google";

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

  const [sortBy, setSortBy] = useState<SortOption>("relevant");

  const [eligible, setEligible] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [eligibleLeadId, setEligibleLeadId] = useState<string | null>(null);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);
  const [nextEligibleAt, setNextEligibleAt] = useState<string | null>(null);
  const [existingRating, setExistingRating] = useState<EligibilityResponse["existingRating"]>(null);

  const [writeOpen, setWriteOpen] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
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
    if (sortBy) sp.set("sort", sortBy);
    if (cursor) sp.set("cursor", cursor);
    return sp.toString();
  }, [filterHasComment, filterStars, realtorId, canSeeAll, sortBy]);

  const fetchEligibility = useCallback(async () => {
    try {
      const res = await fetch(`/api/ratings/eligibility?realtorId=${encodeURIComponent(realtorId)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as EligibilityResponse | null;
      if (!res.ok || !data) {
        setEligible(false);
        setEligibleLeadId(null);
        setRequiresLogin(false);
        setEligibilityReason(null);
        setNextEligibleAt(null);
        return;
      }
      setEligible(Boolean(data.eligible));
      setEligibleLeadId(data.leadId || null);
      setRequiresLogin(Boolean(data.requiresLogin));
      setEligibilityReason(data.reason || null);
      setNextEligibleAt(data.nextEligibleAt || null);
      setExistingRating(data.existingRating || null);
    } catch {
      setEligible(false);
      setEligibleLeadId(null);
      setRequiresLogin(false);
      setEligibilityReason(null);
      setNextEligibleAt(null);
      setExistingRating(null);
    }
  }, [realtorId]);

  const eligibilityHint = useMemo(() => {
    if (requiresLogin) return null;
    if (eligible) return null;
    if (eligibilityReason === "AWAITING_RESPONSE") {
      return "Você poderá avaliar 24h após o corretor responder.";
    }
    if (eligibilityReason === "COOLDOWN" && nextEligibleAt) {
      const d = new Date(nextEligibleAt);
      if (!Number.isNaN(d.getTime())) {
        return `Avaliação disponível em ${d.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}.`;
      }
      return "A avaliação ficará disponível 24h após a resposta do corretor.";
    }
    return null;
  }, [eligible, eligibilityReason, nextEligibleAt, requiresLogin]);

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
  }, [filterStars, filterHasComment, sortBy, fetchRatings]);

  const openWrite = () => {
    setEditingRatingId(null);
    setDraftStars(0);
    setDraftComment("");
    setWriteOpen(true);
  };

  const openEdit = () => {
    if (!existingRating?.id) return;
    setEditingRatingId(existingRating.id);
    setDraftStars(Number(existingRating.rating || 0));
    setDraftComment(existingRating.comment || "");
    setWriteOpen(true);
  };

  const submitReview = async () => {
    if (!draftStars || draftStars < 1 || draftStars > 5) {
      toast.error("Selecione as estrelas", "Escolha uma nota de 1 a 5.");
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = Boolean(editingRatingId);
      if (!isEdit && !eligibleLeadId) {
        toast.error("Não foi possível avaliar", "Você não possui um lead elegível para avaliação.");
        return;
      }

      const res = await fetch("/api/ratings", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? {
                ratingId: editingRatingId,
                rating: draftStars,
                comment: draftComment.trim() ? draftComment.trim() : undefined,
              }
            : {
                leadId: eligibleLeadId,
                realtorId,
                rating: draftStars,
                comment: draftComment.trim() ? draftComment.trim() : undefined,
              }
        ),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !(data?.success ?? true)) {
        toast.error("Não foi possível enviar", data?.message || data?.error || "Tente novamente.");
        return;
      }

      toast.success(isEdit ? "Avaliação atualizada" : "Avaliação enviada", "Obrigado por compartilhar sua experiência.");
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

  const positiveRatings = useMemo(() => {
    return (histogram[4] || 0) + (histogram[5] || 0);
  }, [histogram]);

  const positiveShareLabel = useMemo(() => {
    const denom = histogramTotal || totalRatings || 0;
    if (!denom) return null;
    return `${Math.round((positiveRatings / denom) * 100)}% deram 4★ ou 5★`;
  }, [histogramTotal, positiveRatings, totalRatings]);

  const highlightLabel = useMemo(() => {
    if (!totalRatings || avgRating <= 0) return "Sem amostra pública suficiente ainda";
    if (avgRating >= 4.8) return "Percepção pública de excelência no atendimento";
    if (avgRating >= 4.5) return "Clientes relatam uma experiência muito positiva";
    if (avgRating >= 4) return "Boa experiência geral entre os clientes avaliadores";
    return "Experiência pública em formação com base nas avaliações";
  }, [avgRating, totalRatings]);

  const hasActiveFilters = useMemo(() => {
    return filterStars != null || filterHasComment || sortBy !== "relevant";
  }, [filterHasComment, filterStars, sortBy]);

  const resetFilters = useCallback(() => {
    setFilterStars(null);
    setFilterHasComment(false);
    setSortBy("relevant");
  }, []);

  const socialProofItems = useMemo(() => {
    return [
      {
        label: "Clientes verificados",
        value: totalRatings > 0 ? `${totalRatings}+` : "0",
        tone: "Somente leads que realmente avançaram podem avaliar",
      },
      {
        label: "Leitura rápida",
        value: positiveShareLabel || "Sem base ainda",
        tone: "Recorte da proporção de avaliações mais positivas",
      },
      {
        label: "Contexto",
        value: canSeeAll ? "Visão completa liberada" : "Avaliações públicas moderadas",
        tone: canSeeAll ? "Você está vendo a experiência com visão ampliada" : "A experiência pública prioriza transparência e confiança",
      },
    ];
  }, [canSeeAll, positiveShareLabel, totalRatings]);

  const renderHistogram = (dense?: boolean) => {
    return (
      <div className={dense ? "space-y-2.5" : "space-y-3"}>
        {histogramRows.map((row) => {
          const active = filterStars === row.stars;
          return (
            <button
              key={`hist-${row.stars}`}
              type="button"
              onClick={() => setFilterStars((v) => (v === row.stars ? null : row.stars))}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ${
                active ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
              }`}
            >
              <div className={`flex w-10 items-center gap-1 text-xs font-semibold ${active ? "text-white" : "text-slate-700"}`}>
                <span>{row.stars}</span>
                <Star className={`h-3.5 w-3.5 ${active ? "fill-yellow-300 text-yellow-300" : "fill-amber-400 text-amber-400"}`} />
              </div>
              <div className={`h-2.5 flex-1 overflow-hidden rounded-full ${active ? "bg-white/15" : "bg-slate-100"}`}>
                <div className={`h-full rounded-full ${active ? "bg-white" : "bg-slate-900"}`} style={{ width: `${row.pct}%` }} />
              </div>
              <div className={`w-10 text-right text-xs font-semibold ${active ? "text-white/85" : "text-slate-500"}`}>{row.count}</div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderChips = () => {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
        <button
          type="button"
          onClick={() => setFilterStars(null)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
            filterStars == null ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-sm"
          }`}
        >
          Todas
        </button>
        {[5, 4, 3, 2, 1].map((s) => (
          <button
            key={`star-${s}`}
            type="button"
            onClick={() => setFilterStars((v) => (v === s ? null : s))}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              filterStars === s ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-sm"
            }`}
          >
            {s}★
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFilterHasComment((v) => !v)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
            filterHasComment ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-sm"
          }`}
        >
          Com comentário
        </button>
      </div>
    );
  };

  const renderSort = () => {
    const items: { key: SortOption; label: string }[] = [
      { key: "relevant", label: "Mais relevantes" },
      { key: "newest", label: "Mais recentes" },
      { key: "highest", label: "Maior nota" },
      { key: "lowest", label: "Menor nota" },
    ];

    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ordenar</div>
        <div className="inline-flex overflow-x-auto rounded-full border border-slate-200 bg-white p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((it) => (
            <button
              key={`sort-${it.key}`}
              type="button"
              onClick={() => setSortBy(it.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                sortBy === it.key ? "bg-slate-950 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
    );
  };

  const renderList = () => {
    return (
      <div>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="animate-pulse rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-24 rounded bg-slate-200" />
                <div className="mt-4 h-3 w-full rounded bg-slate-200" />
                <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : ratings.length === 0 ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-700">Ainda não há avaliações.</p>
            <p className="mt-1 text-xs text-slate-500">Se você já virou lead, você pode ser o primeiro a avaliar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ratings.map((r) => {
              const authorName = r.author?.name || "Cliente";
              const propertyTitle = r.lead?.property?.title || null;
              const canReply = canSeeAll;
              const authorInitial = (authorName || "C").trim().charAt(0).toUpperCase();
              const repliedLabel = r.repliedAt ? formatRelativeDate(r.repliedAt) : "";
              return (
                <div key={r.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
                        {r.author?.image ? (
                          <Image src={r.author.image} alt={authorName} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          authorInitial
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <span className="truncate text-sm font-semibold text-slate-950">{authorName}</span>
                          <div className="flex items-center gap-2">
                            <RatingStars readonly rating={r.rating} size="sm" />
                            <span className="text-xs text-slate-400">{formatMonthYear(r.createdAt)}</span>
                          </div>
                        </div>
                        {propertyTitle ? <div className="mt-1 truncate text-xs text-slate-500">{propertyTitle}</div> : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Lead verificado</span>
                    {r.comment ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Comentário detalhado</span> : null}
                  </div>

                  {r.comment ? <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{r.comment}</p> : null}

                  {r.replyText ? (
                    <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Resposta do profissional{repliedLabel ? ` • ${repliedLabel}` : ""}
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{r.replyText}</p>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => reportReview(r.id)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm"
                    >
                      Denunciar
                    </button>

                    {canReply ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyOpenForId((prev) => (prev === r.id ? null : r.id));
                          setDraftReply(r.replyText || "");
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm"
                      >
                        {r.replyText ? "Editar resposta" : "Responder"}
                      </button>
                    ) : null}
                  </div>

                  {canReply && replyOpenForId === r.id && (
                    <div className="mt-3">
                      <textarea
                        value={draftReply}
                        onChange={(e) => setDraftReply(e.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                        placeholder="Escreva uma resposta pública..."
                      />
                      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <Button
                          variant="ghost"
                          size="md"
                          onClick={() => {
                            setReplyOpenForId(null);
                            setDraftReply("");
                          }}
                          disabled={submitting}
                          className="w-full sm:w-auto"
                        >
                          Cancelar
                        </Button>
                        <Button variant="primary" size="md" onClick={() => submitReply(r.id)} loading={submitting} className="w-full sm:w-auto">
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
                <Button variant="secondary" size="md" loading={loadingMore} onClick={fetchMore} className="w-full border-slate-200 text-slate-800 hover:bg-slate-50">
                  Ver mais avaliações
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      id="avaliacoes"
      className={
        isGoogle
          ? "rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          : embedded
            ? "rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            : "rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          {isGoogle ? (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Avaliações públicas</div>
              <h2 className="mt-2 font-serif text-2xl text-slate-950 sm:text-3xl">Experiência de clientes reais</h2>
            </>
          ) : !embedded ? (
            <h2 className="text-lg font-semibold text-slate-900">Avaliações</h2>
          ) : (
            <div className="text-sm font-semibold text-slate-900">Avaliações verificadas</div>
          )}
          <p className={embedded ? "mt-1 text-sm text-slate-600" : "mt-1 text-sm text-slate-500"}>Somente avaliações de clientes que viraram lead.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{highlightLabel}</p>
          {eligibilityHint ? <p className="mt-2 text-sm text-slate-600">{eligibilityHint}</p> : null}
          {existingRating?.id && !canSeeAll ? <p className="mt-2 text-sm text-slate-600">Você já avaliou este profissional. Você pode editar sua avaliação.</p> : null}
          {hasActiveFilters ? <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Filtros ativos aplicados à lista abaixo.</p> : null}
        </div>

        {requiresLogin ? (
          <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => signIn(undefined, { callbackUrl: typeof window !== "undefined" ? window.location.href : undefined })}>
            Entrar para avaliar
          </Button>
        ) : existingRating?.id && !canSeeAll ? (
          <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={openEdit}>
            Editar minha avaliação
          </Button>
        ) : eligible ? (
          <Button variant="primary" size="sm" className="w-full sm:w-auto" onClick={openWrite}>
            Escrever avaliação
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {socialProofItems.map((item) => (
          <div key={item.label} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-slate-950">{item.value}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">{item.tone}</div>
          </div>
        ))}
      </div>

      {isGoogle ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Nota média</div>
                <div className="mt-3 flex items-end gap-3">
                  <div className="font-serif text-5xl leading-none text-slate-950">{ratingLabel}</div>
                  <div className="pb-1">
                    <RatingStars readonly rating={Math.round(avgRating)} size="sm" />
                    <div className="mt-1 text-xs text-slate-500">{totalRatings} avaliação{totalRatings === 1 ? "" : "s"}</div>
                  </div>
                </div>
                <div className="mt-4 text-sm leading-6 text-slate-600">Leitura consolidada da confiança pública construída a partir de clientes que realmente chegaram ao estágio de lead.</div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-950">Filtrar avaliações</div>
                <div className="mt-1 text-xs text-slate-500">Refine por nota ou veja apenas relatos com contexto escrito.</div>
                <div className="mt-3">{renderChips()}</div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-950">Resumo das avaliações</div>
                  <div className="mt-1 text-sm text-slate-600">Veja a distribuição das notas e organize a leitura pela ordem mais útil para comparar percepção, volume e qualidade dos relatos.</div>
                </div>
                <div className="min-w-0">{renderSort()}</div>
              </div>
              <div className="mt-4">{renderHistogram(true)}</div>
              <div className="mt-4 text-xs text-slate-500">{histogramTotal || totalRatings} avaliação{histogramTotal === 1 || totalRatings === 1 ? "" : "s"} consideradas neste resumo.</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-4 text-sm font-semibold text-slate-950">Avaliações</div>
            {renderList()}
          </div>
        </>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reputação pública</div>
              <div className="flex items-end gap-3">
                <div className="font-serif text-4xl leading-none text-slate-950">{ratingLabel}</div>
                <div className="pb-1">
                  <RatingStars readonly rating={Math.round(avgRating)} size="sm" />
                  <div className="mt-1 text-xs text-slate-500">{totalRatings} avaliação{totalRatings === 1 ? "" : "s"}</div>
                </div>
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-600">{positiveShareLabel || "As avaliações aparecerão aqui conforme clientes verificados compartilharem a experiência."}</div>
              <div className="mt-4">{renderHistogram()}</div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-950">Filtrar avaliações</div>
              <div className="mt-1 text-xs text-slate-500">Use filtros rápidos para explorar o que mais importa para você.</div>
              <div className="mt-3">{renderChips()}</div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4">
              {renderSort()}
            </div>
          </div>

          <div>{renderList()}</div>
        </div>
      )}

      {writeOpen && (
        <div className="fixed inset-0 z-[60001] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity" onClick={() => !submitting && setWriteOpen(false)} />
          <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 sm:rounded-[28px]">
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{editingRatingId ? "Editar avaliação" : "Escrever avaliação"}</h3>
                  <p className="mt-1 text-sm text-slate-500">Sua avaliação ficará pública no perfil.</p>
                </div>
                <button
                  type="button"
                  onClick={() => !submitting && setWriteOpen(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-sm font-semibold text-slate-900">Nota</div>
                <RatingStars rating={draftStars} onRate={setDraftStars} size="lg" />
                <div className="mt-2 text-xs leading-5 text-slate-500">Avaliações são aceitas apenas de clientes que realmente avançaram no atendimento.</div>
              </div>

              <div className="mt-5">
                <label className="text-sm font-semibold text-slate-900" htmlFor="review-comment">
                  Comentário (opcional)
                </label>
                <textarea
                  id="review-comment"
                  value={draftComment}
                  onChange={(e) => setDraftComment(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  placeholder="Conte como foi sua experiência..."
                />
                <div className="mt-2 text-xs leading-5 text-slate-500">Se quiser ajudar outros clientes, comente sobre clareza, tempo de resposta e acompanhamento.</div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button variant="ghost" size="md" onClick={() => setWriteOpen(false)} disabled={submitting} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button variant="primary" size="md" onClick={submitReview} loading={submitting} className="w-full sm:w-auto">
                  {editingRatingId ? "Salvar" : "Enviar avaliação"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
