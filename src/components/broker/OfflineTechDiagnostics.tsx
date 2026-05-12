"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

type RolloutLike = {
  rolloutEnabled?: boolean | null;
  rolloutPercent?: number | null;
  experimentPercent?: number | null;
} | null | undefined;

type VersionsLike = {
  promptVersion?: string | null;
  guardrailsVersion?: string | null;
} | null | undefined;

type FunnelLike = {
  averageDataCompleteness?: number | null;
} | null | undefined;

type ExperimentsLike = Array<{ variant: string; count: number }> | null | undefined;

type GuardrailsLike = {
  scenarios?: Array<{ scenario: string; count: number }>;
  rules?: Array<{ rule: string; count: number }>;
} | null | undefined;

type OperationalLike = {
  avgChecklistItems?: number | null;
  pipelineStages?: Array<{ stage: string; count: number }>;
} | null | undefined;

interface OfflineTechDiagnosticsProps {
  role: string | null | undefined;
  rollout: RolloutLike;
  versions: VersionsLike;
  funnel: FunnelLike;
  experiments: ExperimentsLike;
  guardrails: GuardrailsLike;
  operational: OperationalLike;
  formatTokenLabel: (value: string | null | undefined) => string;
  formatPipelineStageLabel: (stage: string) => string;
}

export default function OfflineTechDiagnostics({
  role,
  rollout,
  versions,
  funnel,
  experiments,
  guardrails,
  operational,
  formatTokenLabel,
  formatPipelineStageLabel,
}: OfflineTechDiagnosticsProps) {
  const [open, setOpen] = useState(false);

  if (role !== "ADMIN") return null;

  const rolloutLine = `Rollout ${rollout?.rolloutEnabled ? "ativo" : "controle"} · ${rollout?.rolloutPercent ?? 0}% corretores · ${rollout?.experimentPercent ?? 0}% leads`;
  const versionsLine = `Prompt ${versions?.promptVersion || "—"} · Guardrails ${versions?.guardrailsVersion || "—"}`;
  const completenessLine = `Completude média ${funnel?.averageDataCompleteness ?? 0}%`;

  const topVariant = experiments?.[0];
  const topPipeline = operational?.pipelineStages?.[0];
  const topScenario = guardrails?.scenarios?.[0];
  const topRule = guardrails?.rules?.[0];

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Diagnóstico técnico</p>
          <p className="mt-0.5 text-sm text-gray-700">Telemetria de rollout, prompt e guardrails (admin)</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="border-t border-gray-200 px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-700">
          <div>
            <p className="font-semibold text-gray-900 mb-1">Rollout e versão</p>
            <p>{rolloutLine}</p>
            <p className="mt-1">{versionsLine}</p>
            <p className="mt-1">{completenessLine}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Experimentos e pipeline</p>
            <p>
              Variante líder: {topVariant ? `${formatTokenLabel(topVariant.variant)} (${topVariant.count})` : "—"}
            </p>
            <p className="mt-1">
              Pipeline líder: {topPipeline ? `${formatPipelineStageLabel(topPipeline.stage)} (${topPipeline.count})` : "—"}
            </p>
            <p className="mt-1">Checklist médio do copiloto: {operational?.avgChecklistItems ?? 0}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Guardrails</p>
            <p>
              Cenário líder: {topScenario ? `${formatTokenLabel(topScenario.scenario)} (${topScenario.count})` : "Sem acionamentos"}
            </p>
            <p className="mt-1">
              Regra líder: {topRule ? `${formatTokenLabel(topRule.rule)} (${topRule.count})` : "Sem regras aplicadas"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
