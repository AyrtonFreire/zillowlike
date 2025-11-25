"use client";

import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface DroppableStageColumnProps {
  stageId: string;
  label: string;
  description: string;
  count: number;
  children: ReactNode;
}

export default function DroppableStageColumn({
  stageId,
  label,
  description,
  count,
  children,
}: DroppableStageColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stageId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border flex flex-col max-h-[70vh] transition-all duration-200 w-72 md:w-auto flex-shrink-0 md:flex-shrink ${
        isOver
          ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              isOver
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            {count}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 leading-snug">{description}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
        {children}
      </div>
    </div>
  );
}
