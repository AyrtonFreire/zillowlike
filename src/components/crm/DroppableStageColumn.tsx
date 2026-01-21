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
  description: _description,
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
      className={`rounded-xl bg-white flex flex-col h-full min-h-0 transition-all duration-200 w-72 md:w-auto flex-shrink-0 md:flex-shrink ${
        isOver
          ? "bg-blue-50 ring-2 ring-blue-200"
          : ""
      } ${className || ""}`}
    >
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <div className="flex items-center gap-2">
            {headerRight}
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                isOver
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {count}
            </span>
            {onToggleCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="p-1 -mr-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-black/5"
                aria-label={collapsed ? "Expandir coluna" : "Recolher coluna"}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-2 space-y-3 min-h-0">
          {children}
        </div>
      )}
    </div>
  );
}
