"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronRight,
  Clock3,
  Flame,
  MessageCircle,
} from "lucide-react";
import {
  getLeadNextActionState,
  getLeadStageAgeDays,
  getLeadTemperature,
  getStaleSeverity,
} from "@/lib/lead-operational-signals";
import { PIPELINE_STAGE_META, type CanonicalPipelineStage } from "@/lib/lead-pipeline";

type SortKey = "name" | "stage" | "next" | "stageAge" | "temperature";
type SortDirection = "asc" | "desc";

interface ListLead {
  id: string;
  pipelineStage: string;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
  stageEnteredAt?: string | null;
  visitDate?: string | null;
  lastContactAt?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  hasUnreadMessages?: boolean;
  contact?: { name: string; phone?: string | null } | null;
  property: {
    title: string;
    price?: number | null;
    city: string;
    state: string;
  };
}

interface CrmListViewProps {
  leads: ListLead[];
  onOpenLead?: (leadId: string) => void;
}

const STAGE_BADGE_TONE: Record<CanonicalPipelineStage, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  CONTACT: "bg-amber-50 text-amber-700 border-amber-200",
  VISIT: "bg-purple-50 text-purple-700 border-purple-200",
  PROPOSAL: "bg-cyan-50 text-cyan-700 border-cyan-200",
  DOCUMENTS: "bg-orange-50 text-orange-700 border-orange-200",
  WON: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOST: "bg-gray-50 text-gray-600 border-gray-200",
};

const TEMPERATURE_TONE: Record<"hot" | "warm" | "cool", string> = {
  hot: "text-rose-600",
  warm: "text-amber-600",
  cool: "text-slate-400",
};

function formatPrice(price: number | null | undefined): string {
  if (typeof price !== "number") return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(price / 100);
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey | null;
  direction: SortDirection;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className={`sticky top-0 z-10 cursor-pointer select-none border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-100 ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

export default function CrmListView({ leads, onOpenLead }: CrmListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>("next");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  const sortedLeads = useMemo(() => {
    if (!sortKey) return leads;
    const now = new Date();
    const stageRank: Record<string, number> = {
      NEW: 0,
      CONTACT: 1,
      VISIT: 2,
      PROPOSAL: 3,
      DOCUMENTS: 4,
      WON: 5,
      LOST: 6,
    };
    const tempRank: Record<string, number> = { hot: 0, warm: 1, cool: 2 };
    const arr = [...leads];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = (a.contact?.name || "").localeCompare(b.contact?.name || "");
          break;
        case "stage":
          cmp = (stageRank[a.pipelineStage] || 0) - (stageRank[b.pipelineStage] || 0);
          break;
        case "next": {
          const aMs = a.nextActionDate ? new Date(a.nextActionDate).getTime() : Number.POSITIVE_INFINITY;
          const bMs = b.nextActionDate ? new Date(b.nextActionDate).getTime() : Number.POSITIVE_INFINITY;
          cmp = aMs - bMs;
          break;
        }
        case "stageAge":
          cmp = getLeadStageAgeDays(a, now) - getLeadStageAgeDays(b, now);
          break;
        case "temperature":
          cmp = (tempRank[getLeadTemperature(a, now)] || 0) - (tempRank[getLeadTemperature(b, now)] || 0);
          break;
      }
      return direction === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [leads, sortKey, direction]);

  const now = new Date();

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-sm font-semibold text-slate-700">Nenhum lead para listar.</p>
        <p className="mt-1 text-xs text-slate-500">Ajuste os filtros ou aguarde novos leads chegarem.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <SortableHeader label="Cliente" sortKey="name" currentSort={sortKey} direction={direction} onSort={handleSort} />
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Imóvel
              </th>
              <SortableHeader label="Etapa" sortKey="stage" currentSort={sortKey} direction={direction} onSort={handleSort} />
              <SortableHeader label="Próx. ação" sortKey="next" currentSort={sortKey} direction={direction} onSort={handleSort} />
              <SortableHeader label="Dias na etapa" sortKey="stageAge" currentSort={sortKey} direction={direction} onSort={handleSort} align="right" />
              <SortableHeader label="Temperatura" sortKey="temperature" currentSort={sortKey} direction={direction} onSort={handleSort} />
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLeads.map((lead) => {
              const stage = (lead.pipelineStage || "NEW") as CanonicalPipelineStage;
              const meta = PIPELINE_STAGE_META[stage];
              const nextActionState = getLeadNextActionState(lead, now);
              const stageAge = getLeadStageAgeDays(lead, now);
              const temperature = getLeadTemperature(lead, now);
              const staleSeverity = getStaleSeverity(lead, now);
              const nextActionAt = lead.nextActionDate ? new Date(lead.nextActionDate) : null;
              const nextActionLabel = nextActionState.overdue
                ? "Atrasada"
                : nextActionState.today
                  ? "Hoje"
                  : nextActionAt
                    ? nextActionAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                    : "—";
              const isClosed = stage === "WON" || stage === "LOST";

              return (
                <tr
                  key={lead.id}
                  className={`border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50 ${
                    lead.hasUnreadMessages ? "bg-blue-50/30" : ""
                  } ${onOpenLead ? "cursor-pointer" : ""}`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("a, button")) return;
                    onOpenLead?.(lead.id);
                  }}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {lead.hasUnreadMessages ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-500" aria-label="Mensagens não lidas" />
                      ) : null}
                      <p className="truncate text-sm font-semibold text-slate-900 max-w-[180px]">
                        {lead.contact?.name || "Sem contato"}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="truncate text-xs text-slate-700 max-w-[220px]">{lead.property.title}</p>
                    <p className="text-[11px] text-slate-500">{formatPrice(lead.property.price)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STAGE_BADGE_TONE[stage]}`}
                    >
                      {meta.shortLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {nextActionState.overdue ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                      ) : lead.visitDate ? (
                        <Calendar className="h-3.5 w-3.5 text-purple-500" />
                      ) : (
                        <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      <span className={`text-xs ${nextActionState.overdue ? "font-semibold text-rose-700" : "text-slate-700"}`}>
                        {nextActionLabel}
                      </span>
                      {lead.nextActionNote ? (
                        <span className="truncate text-[11px] text-slate-500 max-w-[160px]">· {lead.nextActionNote}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <span className="text-xs tabular-nums text-slate-700">{stageAge}d</span>
                      {staleSeverity !== "fresh" && !isClosed ? (
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            staleSeverity === "critical"
                              ? "bg-rose-500"
                              : staleSeverity === "risk"
                                ? "bg-orange-500"
                                : "bg-amber-500"
                          }`}
                          aria-label="Sem contato"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs ${TEMPERATURE_TONE[temperature]}`}>
                      <Flame className="h-3.5 w-3.5" />
                      {temperature === "hot" ? "Quente" : temperature === "warm" ? "Em jogo" : "Frio"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/broker/chats?lead=${lead.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Abrir chat"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/broker/leads/${lead.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Ver detalhes"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
