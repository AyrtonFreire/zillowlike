"use client";

import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type HealthTone = "critical" | "warning" | "healthy" | "neutral";

const HEALTH_BORDER: Record<HealthTone, string> = {
  critical: "border-l-rose-500",
  warning: "border-l-amber-400",
  healthy: "border-l-emerald-400",
  neutral: "border-l-slate-300",
};

const HEALTH_COUNT_BG: Record<HealthTone, string> = {
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-slate-50 text-slate-700 border-slate-200",
};

interface DroppableStageColumnProps {
  stageId: string;
  label: string;
  description?: string;
  count: number;
  children: ReactNode;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  headerRight?: ReactNode;
  className?: string;
  healthTone?: HealthTone;
}

export default function DroppableStageColumn({
  stageId,
  label,
  description,
  count,
  children,
  collapsed,
  onToggleCollapsed,
  headerRight,
  className,
  healthTone = "neutral",
}: DroppableStageColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: stageId });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-0 w-72 flex-shrink-0 flex-col rounded-[20px] border border-l-4 bg-white/95 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)] transition-all duration-200 md:w-auto md:flex-shrink ${
        HEALTH_BORDER[healthTone]
      } ${
        isOver ? "border-teal-300 bg-teal-50/60 ring-4 ring-teal-100" : "border-slate-200"
      } ${className || ""}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="truncate text-[13px] font-semibold tracking-tight text-slate-950">{label}</p>
          <span
            className={`inline-flex h-6 min-w-[28px] items-center justify-center rounded-full border px-2 text-[11px] font-semibold tabular-nums ${HEALTH_COUNT_BG[healthTone]}`}
          >
            {count}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {headerRight}
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="-mr-1 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={collapsed ? "Expandir coluna" : "Recolher coluna"}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {description && !collapsed ? (
        <p className="px-4 pt-2 text-[11px] leading-snug text-slate-500">{description}</p>
      ) : null}

      {!collapsed && (
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}
