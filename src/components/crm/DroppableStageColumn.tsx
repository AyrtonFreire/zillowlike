"use client";

import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface DroppableStageColumnProps {
  stageId: string;
  label: string;
  description: string;
  count: number;
  children: ReactNode;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  headerRight?: ReactNode;
  className?: string;
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
}: DroppableStageColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stageId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-0 w-72 flex-shrink-0 flex-col rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] transition-all duration-200 backdrop-blur md:w-auto md:flex-shrink ${
        isOver
          ? "border-teal-300 bg-teal-50/70 ring-4 ring-teal-100"
          : ""
      } ${className || ""}`}
    >
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-950">{label}</p>
            {description ? <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                isOver
                  ? "border-teal-200 bg-teal-100 text-teal-700"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {count}
            </span>
            {onToggleCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="-mr-1 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={collapsed ? "Expandir coluna" : "Recolher coluna"}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}
