"use client";

import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

type Stage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

interface CrmEmptyStateProps {
  stage: Stage;
  icon: LucideIcon;
  iconColorClass: string;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const STAGE_COPY: Record<Stage, { title: string; description: string; ctaLabel?: string; ctaHref?: string }> = {
  NEW: {
    title: "Nenhum lead novo por aqui",
    description: "Quando novas oportunidades chegarem pelo mural ou contato direto, elas aparecem nesta coluna.",
    ctaLabel: "Ver leads disponíveis",
    ctaHref: "/broker/leads/mural",
  },
  CONTACT: {
    title: "Nenhum lead em contato",
    description: "Mova um lead novo para cá ao iniciar conversa — ou ele avança automaticamente quando o cliente responder.",
  },
  VISIT: {
    title: "Nenhuma visita agendada",
    description: "Confirme uma visita com o cliente e mova o card para cá. Visitas agendadas ganham destaque no funil.",
  },
  PROPOSAL: {
    title: "Nenhuma proposta em aberto",
    description: "Quando o cliente demonstrar interesse comercial, mova o card para cá para acompanhar a negociação.",
  },
  DOCUMENTS: {
    title: "Nenhum lead em documentos",
    description: "Use esta etapa quando estiver coletando contrato, documentação ou pendências finais para o fechamento.",
  },
  WON: {
    title: "Ainda sem negócios fechados aqui",
    description: "Arraste um card para esta etapa quando o negócio for concretizado. Vamos registrar o histórico de ganhos.",
  },
  LOST: {
    title: "Sem perdas registradas",
    description: "Mover um lead para cá ajuda a entender padrões e melhorar a abordagem no futuro.",
  },
};

export default function CrmEmptyState({
  stage,
  icon: Icon,
  iconColorClass,
  hasActiveFilters,
  onClearFilters,
}: CrmEmptyStateProps) {
  const copy = STAGE_COPY[stage];

  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
        <Icon className={`mb-3 h-8 w-8 ${iconColorClass} opacity-35`} />
        <p className="text-sm font-semibold text-slate-700">Sem resultados para o filtro atual</p>
        <p className="mt-1 max-w-[220px] text-xs leading-6 text-slate-500">
          Existe atividade nesta etapa, mas nada bate com o filtro aplicado.
        </p>
        {onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
      <Icon className={`mb-3 h-8 w-8 ${iconColorClass} opacity-35`} />
      <p className="text-sm font-semibold text-slate-700">{copy.title}</p>
      <p className="mt-1 max-w-[240px] text-xs leading-6 text-slate-500">{copy.description}</p>
      {copy.ctaLabel && copy.ctaHref ? (
        <Link
          href={copy.ctaHref}
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
        >
          {copy.ctaLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}
