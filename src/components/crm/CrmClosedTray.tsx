"use client";

import { useState } from "react";
import Link from "next/link";
import { useDroppable } from "@dnd-kit/core";
import { ChevronDown, ChevronUp, Trophy, XCircle } from "lucide-react";

type ClosedStage = "WON" | "LOST";

type ClosedLead = {
  id: string;
  pipelineStage: string;
  contact?: { name: string } | null;
  property: {
    title: string;
    price?: number | null;
    city: string;
    state: string;
  };
  outcomeReason?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
};

interface CrmClosedTrayProps {
  wonLeads: ClosedLead[];
  lostLeads: ClosedLead[];
  windowDays?: number;
}

function formatRelativeShort(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  return `${months}m atrás`;
}

function formatPrice(price: number | null | undefined): string | null {
  if (typeof price !== "number") return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(price / 100);
}

function DropZone({ stage, children }: { stage: ClosedStage; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });
  const tone = stage === "WON" ? "emerald" : "rose";
  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-[120px] flex-col rounded-2xl border-2 border-dashed bg-slate-50/40 p-3 transition-colors ${
        isOver
          ? tone === "emerald"
            ? "border-emerald-400 bg-emerald-50"
            : "border-rose-400 bg-rose-50"
          : "border-slate-200"
      }`}
    >
      {children}
    </div>
  );
}

function MiniClosedCard({ lead }: { lead: ClosedLead }) {
  const priceLabel = formatPrice(lead.property.price);
  const when = formatRelativeShort(lead.completedAt || lead.updatedAt);
  return (
    <Link
      href={`/broker/leads/${lead.id}`}
      className="block rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-slate-300 hover:bg-slate-50/70 transition-colors"
    >
      <p className="truncate text-[12px] font-semibold text-slate-900">
        {lead.contact?.name || "Sem contato"}
      </p>
      <p className="truncate text-[11px] text-slate-600">{lead.property.title}</p>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
        {priceLabel ? <span className="font-semibold text-slate-700">{priceLabel}</span> : <span />}
        <span className="text-slate-400">{when}</span>
      </div>
      {lead.outcomeReason ? (
        <p className="mt-1 truncate text-[10px] text-slate-500">{lead.outcomeReason}</p>
      ) : null}
    </Link>
  );
}

export default function CrmClosedTray({ wonLeads, lostLeads, windowDays = 30 }: CrmClosedTrayProps) {
  const [open, setOpen] = useState(false);
  const total = wonLeads.length + lostLeads.length;

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Negócios fechados <span className="font-normal text-slate-500">— últimos {windowDays} dias</span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              <span className="font-semibold text-emerald-700">{wonLeads.length} ganhos</span> ·{" "}
              <span className="font-semibold text-rose-700">{lostLeads.length} perdidos</span>
              {total === 0 ? " · Nada por aqui ainda." : ""}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DropZone stage="WON">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <Trophy className="h-3.5 w-3.5" />
                Ganhos <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 tabular-nums">{wonLeads.length}</span>
              </div>
              {wonLeads.length === 0 ? (
                <p className="flex-1 flex items-center justify-center text-center text-[11px] text-slate-400">
                  Solte um card aqui para marcar como ganho.
                </p>
              ) : (
                <div className="space-y-2">
                  {wonLeads.map((lead) => (
                    <MiniClosedCard key={lead.id} lead={lead} />
                  ))}
                </div>
              )}
            </DropZone>

            <DropZone stage="LOST">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                <XCircle className="h-3.5 w-3.5" />
                Perdidos <span className="rounded-full bg-rose-100 px-1.5 py-0.5 tabular-nums">{lostLeads.length}</span>
              </div>
              {lostLeads.length === 0 ? (
                <p className="flex-1 flex items-center justify-center text-center text-[11px] text-slate-400">
                  Solte um card aqui para marcar como perdido.
                </p>
              ) : (
                <div className="space-y-2">
                  {lostLeads.map((lead) => (
                    <MiniClosedCard key={lead.id} lead={lead} />
                  ))}
                </div>
              )}
            </DropZone>
          </div>
        </div>
      ) : null}
    </div>
  );
}
