"use client";

import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ChevronRight, GripVertical, Loader2, MessageCircle, Bell, BellOff, AlertTriangle } from "lucide-react";

interface DraggableLeadCardProps {
  lead: {
    id: string;
    pipelineStage: string;
    nextActionDate?: string | null;
    nextActionNote?: string | null;
    hasUnreadMessages?: boolean;
    lastMessagePreview?: string | null;
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
  isReminderUpdating?: boolean;
  showAdvanceButton?: boolean;
  onAdvance?: () => void | Promise<void>;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
  onOpenChat?: () => void;
  onToggleReminder?: () => void;
  dndDisabledOverride?: boolean;
  className?: string;
}

export default function DraggableLeadCard({
  lead,
  isUpdating,
  isReminderUpdating,
  showAdvanceButton,
  onAdvance,
  selectionMode,
  selected,
  onToggleSelected,
  onOpenChat,
  onToggleReminder,
  dndDisabledOverride,
  className,
}: DraggableLeadCardProps) {
  const dragDisabled = dndDisabledOverride ?? (!!selectionMode || !!isUpdating || !!isReminderUpdating);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: dragDisabled,
    data: {
      leadId: lead.id,
      currentStage: lead.pipelineStage,
    },
  });

  const now = new Date();
  const nextActionAt = lead.nextActionDate ? new Date(lead.nextActionDate) : null;
  const hasNextAction = !!lead.nextActionDate || !!lead.nextActionNote;
  const isOverdue = nextActionAt ? !Number.isNaN(nextActionAt.getTime()) && nextActionAt.getTime() < now.getTime() : false;

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0 : 1,
  };

  const dragProps = !dragDisabled
    ? {
        ...listeners,
        ...attributes,
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={`bg-white rounded-2xl border ${
        isDragging ? "border-teal-400 shadow-xl" : "border-gray-200"
      } p-3 md:p-4 text-xs md:text-[13px] text-gray-900 flex flex-col gap-2 transition-shadow overflow-hidden ${
        dragDisabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      } ${className || ""}`}
    >
      {/* Mobile layout (mantém o visual atual) */}
      <div className="md:hidden">
        <div className="flex items-start gap-2">
          {selectionMode && (
            <button
              type="button"
              onClick={onToggleSelected}
              onPointerDown={(e) => e.stopPropagation()}
              className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                selected ? "bg-purple-600 border-purple-600" : "bg-white border-gray-300"
              }`}
              aria-label={selected ? "Desmarcar lead" : "Selecionar lead"}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${selected ? "bg-white" : "bg-transparent"}`} />
            </button>
          )}

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
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              {!!lead.hasUnreadMessages && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <MessageCircle className="w-3 h-3" />
                  Não lida
                </span>
              )}
              {hasNextAction && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isOverdue ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Próx. ação
                </span>
              )}
            </div>

            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              <span className="truncate">
                {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                {lead.property.city} - {lead.property.state}
              </span>
            </p>
            {lead.contact?.name && (
              <p className="text-[11px] text-gray-500 mt-0.5">Cliente: {lead.contact.name}</p>
            )}
            {!!lead.lastMessagePreview && (
              <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{lead.lastMessagePreview}</p>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/broker/leads/${lead.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center text-[11px] text-blue-600 hover:text-blue-700"
            >
              Ver detalhes
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
            {onOpenChat && !selectionMode && (
              <button
                type="button"
                onClick={onOpenChat}
                onPointerDown={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-900"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Chat
              </button>
            )}
            {onToggleReminder && !selectionMode && (
              <button
                type="button"
                onClick={onToggleReminder}
                disabled={isReminderUpdating}
                onPointerDown={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                {hasNextAction ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                {isReminderUpdating ? "Salvando..." : "Lembrete"}
              </button>
            )}
          </div>
          {showAdvanceButton && (
            <button
              type="button"
              onClick={onAdvance}
              disabled={isUpdating || selectionMode}
              onPointerDown={(e) => e.stopPropagation()}
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

      {/* Desktop layout (redesign) */}
      <div className="hidden md:block">
        <div className="flex items-start gap-3">
          {selectionMode && (
            <button
              type="button"
              onClick={onToggleSelected}
              onPointerDown={(e) => e.stopPropagation()}
              className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                selected ? "bg-purple-600 border-purple-600" : "bg-white border-gray-300"
              }`}
              aria-label={selected ? "Desmarcar lead" : "Selecionar lead"}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${selected ? "bg-white" : "bg-transparent"}`} />
            </button>
          )}

          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            <Image
              src={lead.property.images[0]?.url || "/placeholder.jpg"}
              alt={lead.property.title}
              fill
              className="object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-[15px] leading-snug line-clamp-2">{lead.property.title}</p>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {!!lead.hasUnreadMessages && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <MessageCircle className="w-3 h-3" />
                    Não lida
                  </span>
                )}
                {hasNextAction && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isOverdue ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Próx. ação
                  </span>
                )}
                <GripVertical className="w-4 h-4 text-gray-300" />
              </div>
            </div>

            <p className="text-[12px] text-gray-600 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">
                {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                {lead.property.city} - {lead.property.state}
              </span>
            </p>
            {lead.contact?.name && (
              <p className="text-[12px] text-gray-600 mt-1">
                <span className="text-gray-500">Cliente:</span> {lead.contact.name}
              </p>
            )}
            {!!lead.lastMessagePreview && (
              <p className="text-[12px] text-gray-700 mt-2 line-clamp-3">{lead.lastMessagePreview}</p>
            )}
          </div>
        </div>

        <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Link
              href={`/broker/leads/${lead.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center text-[12px] text-blue-600 hover:text-blue-700"
            >
              Ver detalhes
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
            {onOpenChat && !selectionMode && (
              <button
                type="button"
                onClick={onOpenChat}
                onPointerDown={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[12px] text-gray-600 hover:text-gray-900"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
            )}
            {onToggleReminder && !selectionMode && (
              <button
                type="button"
                onClick={onToggleReminder}
                disabled={isReminderUpdating}
                onPointerDown={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[12px] text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                {hasNextAction ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {isReminderUpdating ? "Salvando..." : "Lembrete"}
              </button>
            )}
          </div>

          {showAdvanceButton && (
            <button
              type="button"
              onClick={onAdvance}
              disabled={isUpdating || selectionMode}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Movendo...
                </>
              ) : (
                "Avançar"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
