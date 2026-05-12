"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Flame,
  Sparkles,
} from "lucide-react";
import {
  BADGE_TONE_CLASSES,
  pickHeadlineAction,
  pickPrimaryBadges,
  type OfflineBadge,
  type OfflineBadgeIcon,
} from "@/lib/offline-assistant-presentation";
import {
  formatLeadTemperatureLabel,
  formatPipelineStageLabel,
  formatRecommendedActionLabel,
} from "@/lib/offline-assistant-intelligence";

export type OfflineLeadCardData = {
  leadId: string;
  contactName?: string | null;
  propertyTitle?: string | null;
  lastActivityAt?: string | null;

  // Badges
  responsePriority?: string | null;
  visitRequested?: boolean | null;
  handoffNeeded?: boolean | null;
  leadTemperature?: string | null;
  qualifiedFlag?: boolean | null;
  visitPreferences?: { period?: string | null; days?: string[] | null; time?: string | null } | null;
  counts?: { sent?: number | null; failed?: number | null; skipped?: number | null } | null;

  // Content (mostly full mode)
  lastClientMessagePreview?: string | null;
  lastAssistantMessagePreview?: string | null;
  policy?: { nextQuestion?: string | null; recommendedAction?: string | null } | null;
  handoff?: { recommendedAction?: string | null } | null;
  qualification?: { recommendedAction?: string | null; dataCompleteness?: number | null } | null;
  commercialSummary?: string | null;
  propertyContext?: {
    propertySummary?: string | null;
    regionSummary?: string | null;
    fitHighlights?: string[] | null;
    attentionFlags?: string[] | null;
  } | null;
  operationalPlaybook?: {
    headline?: string | null;
    whyNow?: string | null;
    pipelineStage?: string | null;
    actionChecklist?: string[] | null;
    followUpDraft?: string | null;
  } | null;
  clientSlots?: Record<string, any> | null;
};

interface OfflineLeadCardProps {
  data: OfflineLeadCardData;
  variant?: "compact" | "full";
  href?: string;
  onCopyToast?: (message: string) => void;
}

const BADGE_ICON_MAP: Record<OfflineBadgeIcon, typeof Flame> = {
  flame: Flame,
  calendar: Calendar,
  clock: Clock,
  alert: AlertCircle,
  sparkles: Sparkles,
};

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${Math.max(diffMins, 1)} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return d.toLocaleDateString("pt-BR");
}

function BadgePill({ badge }: { badge: OfflineBadge }) {
  const Icon = badge.icon ? BADGE_ICON_MAP[badge.icon] : null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${BADGE_TONE_CLASSES[badge.tone]}`}
    >
      {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
      {badge.label}
    </span>
  );
}

function renderSlotsChips(clientSlots: Record<string, any> | null | undefined): React.ReactNode {
  if (!clientSlots || typeof clientSlots !== "object") return null;
  const chips: string[] = [];

  const purpose = String(clientSlots.purpose || "").toUpperCase();
  if (purpose === "COMPRA") chips.push("Compra");
  if (purpose === "LOCACAO") chips.push("Locação");

  const beds = Number(clientSlots.bedroomsNeeded);
  if (Number.isFinite(beds) && beds > 0) chips.push(`${beds} ${beds === 1 ? "quarto" : "quartos"}`);

  const parking = Number(clientSlots.parkingSpotsNeeded);
  if (Number.isFinite(parking)) chips.push(parking > 0 ? `${parking} ${parking === 1 ? "vaga" : "vagas"}` : "Sem vaga");

  const budget = clientSlots.budget;
  if (budget && typeof budget === "object") {
    const min = Number(budget.min);
    const max = Number(budget.max);
    if (Number.isFinite(min) || Number.isFinite(max)) {
      const fmt = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
      if (Number.isFinite(min) && Number.isFinite(max)) chips.push(`${fmt(min)} – ${fmt(max)}`);
      else if (Number.isFinite(max)) chips.push(`Até ${fmt(max)}`);
      else if (Number.isFinite(min)) chips.push(`A partir de ${fmt(min)}`);
    }
  }

  const region = String(clientSlots.searchRegion || "").trim();
  if (region) chips.push(region);

  const move = String(clientSlots.moveTime || "").trim();
  if (move) chips.push(`Mudança: ${move}`);

  const stage = String(clientSlots.decisionStage || "").toLowerCase().replace(/_/g, " ");
  if (stage) chips.push(`Estágio: ${stage}`);

  if (chips.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export default function OfflineLeadCard({ data, variant = "full", href, onCopyToast }: OfflineLeadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const badges = pickPrimaryBadges(
    {
      responsePriority: data.responsePriority,
      visitRequested: data.visitRequested,
      handoffNeeded: data.handoffNeeded,
      leadTemperature: data.leadTemperature,
      qualifiedFlag: data.qualifiedFlag,
      counts: data.counts,
      visitPreferences: data.visitPreferences,
    },
    variant === "compact" ? 2 : 3,
  );

  const headlineAction = pickHeadlineAction({
    policy: data.policy,
    handoff: data.handoff,
    qualification: data.qualification,
    operationalPlaybook: data.operationalPlaybook,
  });

  const contact = data.contactName || "Cliente";
  const title = data.propertyTitle || "Lead";
  const when = formatRelativeTime(data.lastActivityAt || null);
  const linkHref = href || `/broker/leads/${data.leadId}`;
  const draft = data.operationalPlaybook?.followUpDraft || "";

  async function handleCopy() {
    if (!draft || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      onCopyToast?.("Draft copiado para o clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopyToast?.("Não consegui copiar — tente selecionar manualmente");
    }
  }

  // COMPACT variant (dashboard mini-card)
  if (variant === "compact") {
    const preview = data.commercialSummary || data.operationalPlaybook?.headline || data.propertyContext?.propertySummary || null;
    return (
      <Link
        href={linkHref}
        className="block rounded-xl border border-gray-100 bg-white px-3 py-3 hover:border-gray-200 hover:shadow-sm transition-all"
      >
        <p className="text-[12px] font-semibold text-gray-900 line-clamp-1">{contact}</p>
        <p className="text-[11px] text-gray-500 line-clamp-1">{title}</p>

        {badges.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {badges.slice(0, 2).map((b) => (
              <BadgePill key={b.kind} badge={b} />
            ))}
          </div>
        ) : null}

        {preview ? (
          <p className="mt-2 text-[11px] text-gray-600 line-clamp-2">{preview}</p>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-gray-400">{when}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700">
            Responder <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </Link>
    );
  }

  // FULL variant (offline page lead list)
  const temperatureLabel = data.leadTemperature
    ? formatLeadTemperatureLabel(String(data.leadTemperature))
    : null;
  const playbook = data.operationalPlaybook;
  const checklist = Array.isArray(playbook?.actionChecklist) ? playbook!.actionChecklist!.slice(0, 3) : [];
  const fitHighlights = Array.isArray(data.propertyContext?.fitHighlights)
    ? data.propertyContext!.fitHighlights!.slice(0, 2)
    : [];
  const attentionFlags = Array.isArray(data.propertyContext?.attentionFlags)
    ? data.propertyContext!.attentionFlags!.slice(0, 2)
    : [];
  const nextStepText = data.policy?.nextQuestion || null;
  const headlineLabel = headlineAction ? formatRecommendedActionLabel(headlineAction) : null;
  const stageLabel = playbook?.pipelineStage ? formatPipelineStageLabel(playbook.pipelineStage) : null;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      {/* Header */}
      <header>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 line-clamp-1">
              {contact} <span className="text-gray-400">·</span>{" "}
              <span className="font-normal text-gray-700">{title}</span>
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
              <span>{when}</span>
              {temperatureLabel ? (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="inline-flex items-center gap-1">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${data.leadTemperature === "HOT" ? "bg-rose-500" : "bg-amber-500"}`} />
                    {temperatureLabel}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        {badges.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((b) => (
              <BadgePill key={b.kind} badge={b} />
            ))}
          </div>
        ) : null}
      </header>

      {/* Body — máx 3 blocos */}
      <div className="mt-4 space-y-3">
        {data.lastClientMessagePreview ? (
          <section className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Última do cliente</p>
            <p className="mt-1 text-sm text-gray-800 line-clamp-2">{data.lastClientMessagePreview}</p>
          </section>
        ) : null}

        {headlineLabel || playbook?.headline ? (
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Próxima ação sugerida</p>
            <p className="mt-1 text-sm text-gray-800">
              {headlineLabel || playbook?.headline}
              {stageLabel ? <span className="ml-2 text-xs text-gray-500">· {stageLabel}</span> : null}
            </p>
          </section>
        ) : null}

        {draft ? (
          <section className="rounded-lg border border-teal-100 bg-teal-50/40 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">Draft de follow-up</p>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-white px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                aria-label="Copiar draft de follow-up"
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <p className="mt-1.5 text-sm text-gray-800 whitespace-pre-wrap">{draft}</p>
          </section>
        ) : null}
      </div>

      {/* Accordion: contexto completo */}
      {(data.commercialSummary ||
        data.propertyContext?.propertySummary ||
        data.propertyContext?.regionSummary ||
        nextStepText ||
        playbook?.whyNow ||
        checklist.length > 0 ||
        fitHighlights.length > 0 ||
        attentionFlags.length > 0 ||
        data.clientSlots) ? (
        <details
          className="mt-4 group"
          open={expanded}
          onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer list-none inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900">
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            Ver contexto completo
          </summary>

          <div className="mt-3 space-y-2.5 rounded-lg bg-gray-50 px-3 py-3 text-xs text-gray-700">
            {data.commercialSummary ? (
              <p>
                <span className="font-semibold text-gray-900">Resumo comercial: </span>
                {data.commercialSummary}
              </p>
            ) : null}
            {data.propertyContext?.propertySummary ? (
              <p>
                <span className="font-semibold text-gray-900">Imóvel: </span>
                {data.propertyContext.propertySummary}
              </p>
            ) : null}
            {data.propertyContext?.regionSummary ? (
              <p>
                <span className="font-semibold text-gray-900">Região: </span>
                {data.propertyContext.regionSummary}
              </p>
            ) : null}
            {nextStepText ? (
              <p>
                <span className="font-semibold text-gray-900">Pergunta a fazer: </span>
                {nextStepText}
              </p>
            ) : null}
            {playbook?.whyNow ? (
              <p>
                <span className="font-semibold text-gray-900">Por quê agora: </span>
                {playbook.whyNow}
              </p>
            ) : null}
            {checklist.length > 0 ? (
              <div>
                <p className="font-semibold text-gray-900">Checklist:</p>
                <ul className="mt-1 list-disc pl-5 space-y-0.5">
                  {checklist.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {fitHighlights.length > 0 ? (
              <p>
                <span className="font-semibold text-emerald-700">Aderência: </span>
                {fitHighlights.join(" · ")}
              </p>
            ) : null}
            {attentionFlags.length > 0 ? (
              <p>
                <span className="font-semibold text-rose-700">Pontos de atenção: </span>
                {attentionFlags.join(" · ")}
              </p>
            ) : null}
            {renderSlotsChips(data.clientSlots)}
          </div>
        </details>
      ) : null}

      {/* CTA */}
      <div className="mt-4 flex justify-end">
        <Link
          href={linkHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
        >
          Responder no chat
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}
