"use client";

import { Fragment } from "react";
import { X, Check } from "lucide-react";

export type FunnelViewPreset =
  | "all"
  | "unread"
  | "overdue"
  | "stale"
  | "visits"
  | "proposals"
  | "documents"
  | "hot";

interface FilterOption {
  key: FunnelViewPreset;
  label: string;
  description?: string;
  count?: number;
}

interface FilterGroup {
  title: string;
  hint?: string;
  options: FilterOption[];
}

interface CrmFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  active: FunnelViewPreset;
  onChange: (k: FunnelViewPreset) => void;
  groups: FilterGroup[];
  variant?: "drawer" | "sidebar";
}

function OptionRow({ option, active, onSelect }: { option: FilterOption; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span className="flex items-center gap-2 min-w-0">
        {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span className="inline-block h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{option.label}</span>
      </span>
      {typeof option.count === "number" ? (
        <span
          className={`ml-2 inline-flex h-5 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {option.count}
        </span>
      ) : null}
    </button>
  );
}

function Content({ groups, active, onChange, onClose, showClose }: {
  groups: FilterGroup[];
  active: FunnelViewPreset;
  onChange: (k: FunnelViewPreset) => void;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const hasActive = active !== "all";
  return (
    <Fragment>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Filtros</p>
          <p className="text-[11px] text-slate-500">Combine sinais para focar nas oportunidades.</p>
        </div>
        {showClose && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar filtros"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{group.title}</p>
            {group.hint ? <p className="px-1 pt-0.5 text-[11px] text-slate-400">{group.hint}</p> : null}
            <div className="mt-2 space-y-1">
              {group.options.map((opt) => (
                <OptionRow
                  key={opt.key}
                  option={opt}
                  active={active === opt.key}
                  onSelect={() => onChange(opt.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={() => onChange("all")}
          disabled={!hasActive}
          className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Limpar filtros
        </button>
      </div>
    </Fragment>
  );
}

export default function CrmFilterDrawer({
  open,
  onClose,
  active,
  onChange,
  groups,
  variant = "drawer",
}: CrmFilterDrawerProps) {
  if (variant === "sidebar") {
    return (
      <aside className="hidden lg:flex sticky top-4 h-[calc(100vh-2rem)] w-[280px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Content groups={groups} active={active} onChange={onChange} />
      </aside>
    );
  }

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-[320px] max-w-[88vw] flex-col bg-white shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <Content groups={groups} active={active} onChange={onChange} onClose={onClose} showClose />
      </div>
    </>
  );
}
