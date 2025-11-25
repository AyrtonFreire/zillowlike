"use client";

import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ChevronRight, GripVertical, Loader2 } from "lucide-react";

interface DraggableLeadCardProps {
  lead: {
    id: string;
    pipelineStage: string;
    property: {
      title: string;
      city: string;
      state: string;
      neighborhood?: string | null;
      images: Array<{ url: string }>;
    };
    contact?: {
      name: string;
    } | null;
  };
  isUpdating?: boolean;
  showAdvanceButton?: boolean;
  onAdvance?: () => void;
}

export default function DraggableLeadCard({
  lead,
  isUpdating,
  showAdvanceButton,
  onAdvance,
}: DraggableLeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: {
      leadId: lead.id,
      currentStage: lead.pipelineStage,
    },
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border ${isDragging ? "border-blue-400 shadow-lg" : "border-gray-200"} p-3 text-xs text-gray-800 flex flex-col gap-1 transition-shadow`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="p-1 -ml-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Arrastar lead"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
          <Image
            src={lead.property.images[0]?.url || "/placeholder.jpg"}
            alt={lead.property.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold line-clamp-2">{lead.property.title}</p>
          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            <span className="truncate">
              {lead.property.neighborhood && `${lead.property.neighborhood}, `}
              {lead.property.city} - {lead.property.state}
            </span>
          </p>
          {lead.contact?.name && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              Cliente: {lead.contact.name}
            </p>
          )}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <Link
          href={`/broker/leads/${lead.id}`}
          className="inline-flex items-center text-[11px] text-blue-600 hover:text-blue-700"
        >
          Ver detalhes
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
        {showAdvanceButton && (
          <button
            type="button"
            onClick={onAdvance}
            disabled={isUpdating}
            className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Movendo...
              </>
            ) : (
              "Avançar"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
