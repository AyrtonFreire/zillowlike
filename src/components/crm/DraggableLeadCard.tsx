"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ChevronRight, Loader2, MessageCircle, Bell, BellOff, AlertTriangle, CalendarClock, Clock3, Flame } from "lucide-react";
import { PIPELINE_STAGE_META, type CanonicalPipelineStage } from "@/lib/lead-pipeline";
import { getLeadNextActionState, getLeadStageAgeDays, getLeadTemperature, isLeadStale } from "@/lib/lead-operational-signals";

interface DraggableLeadCardProps {
  lead: {
    id: string;
    pipelineStage: string;
    nextActionDate?: string | null;
    nextActionNote?: string | null;
    stageEnteredAt?: string | null;
    visitDate?: string | null;
    visitTime?: string | null;
    outcomeReason?: string | null;
    outcomeDescription?: string | null;
    hasUnreadMessages?: boolean;
    lastMessagePreview?: string | null;
    lastMessageFromClient?: boolean;
    lastContactAt?: string | null;
    property: {
      title: string;
      price?: number | null;
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
  onHoverStart?: (rect: DOMRect) => void;
  onHoverEnd?: () => void;
  onOpenLead?: () => void;
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
  onHoverStart,
  onHoverEnd,
  onOpenLead,
  dndDisabledOverride,
  className,
}: DraggableLeadCardProps) {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
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
  const stageKey = (String(lead.pipelineStage || "NEW").toUpperCase() as CanonicalPipelineStage);
  const stageMeta = PIPELINE_STAGE_META[stageKey] || PIPELINE_STAGE_META.NEW;
  const nextActionState = getLeadNextActionState(lead, now);
  const stageAgeDays = getLeadStageAgeDays(lead, now);
  const leadTemperature = getLeadTemperature(lead, now);
  const staleLead = isLeadStale(lead, 48, now);
  const priceLabel =
    typeof lead.property.price === "number"
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(lead.property.price / 100)
      : null;
  const visitDateLabel = lead.visitDate
    ? new Date(lead.visitDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;
  const temperatureMeta =
    leadTemperature === "hot"
      ? { label: "Quente", className: "bg-rose-50 text-rose-700 border-rose-200" }
      : leadTemperature === "warm"
        ? { label: "Em jogo", className: "bg-amber-50 text-amber-700 border-amber-200" }
        : { label: "Frio", className: "bg-slate-50 text-slate-600 border-slate-200" };

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

  const setRefs = (node: HTMLDivElement | null) => {
    cardRef.current = node;
    setNodeRef(node);
  };

  const handleMouseEnter = () => {
    if (!onHoverStart || !cardRef.current) return;
    onHoverStart(cardRef.current.getBoundingClientRect());
  };

  return (
    <div
      ref={setRefs}
      style={style}
      {...dragProps}
      className={`rounded-2xl ${dragDisabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${className || ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHoverEnd}
      onClick={(event) => {
        if (!onOpenLead || selectionMode) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest("a, button")) return;
        onOpenLead();
      }}
    >
      <div
        className={`bg-white rounded-2xl border ${
          isDragging ? "border-teal-400 shadow-xl" : "border-gray-200"
        } p-3 md:p-3 text-xs md:text-[13px] text-gray-900 flex flex-col gap-2 overflow-hidden transition-all duration-150 will-change-transform ${
          isDragging
            ? ""
            : "hover:-translate-y-[1px] hover:shadow-md hover:border-gray-300"
        }`}
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
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stageMeta.bgColor} ${stageMeta.color} ${stageMeta.borderColor}`}>
                {stageMeta.shortLabel}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${temperatureMeta.className}`}>
                <Flame className="w-3 h-3" />
                {temperatureMeta.label}
              </span>
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
              {lead.visitDate && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                  <CalendarClock className="w-3 h-3" />
                  {visitDateLabel || "Visita"}
                </span>
              )}
            </div>

            {priceLabel ? <p className="mt-1 text-[12px] font-bold text-teal-700">{priceLabel}</p> : null}

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
              <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                {lead.lastMessageFromClient ? "Cliente: " : "Você: "}
                {lead.lastMessagePreview}
              </p>
            )}
            {!lead.lastMessagePreview && lead.outcomeDescription ? (
              <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{lead.outcomeDescription}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                <Clock3 className="w-3 h-3" />
                {stageAgeDays}d na etapa
              </span>
              {staleLead ? <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">48h+</span> : null}
              {lead.outcomeReason ? <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">{lead.outcomeReason}</span> : null}
            </div>
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
        <div className="relative w-full h-20 rounded-xl overflow-hidden bg-gray-100">
          <Image
            src={lead.property.images[0]?.url || "/placeholder.jpg"}
            alt={lead.property.title}
            fill
            className="object-cover"
          />
          {selectionMode && (
            <button
              type="button"
              onClick={onToggleSelected}
              onPointerDown={(e) => e.stopPropagation()}
              className={`absolute top-2 left-2 w-5 h-5 rounded-md border flex items-center justify-center ${
                selected ? "bg-purple-600 border-purple-600" : "bg-white/95 border-gray-300"
              }`}
              aria-label={selected ? "Desmarcar lead" : "Selecionar lead"}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${selected ? "bg-white" : "bg-transparent"}`} />
            </button>
          )}
        </div>

        <div className="mt-2 min-w-0">
          <p className="font-semibold text-[14px] leading-snug truncate">{lead.property.title}</p>
          {lead.contact?.name && <p className="text-[12px] text-gray-600 truncate">{lead.contact.name}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stageMeta.bgColor} ${stageMeta.color} ${stageMeta.borderColor}`}>
              {stageMeta.shortLabel}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${temperatureMeta.className}`}>
              <Flame className="w-3 h-3" />
              {temperatureMeta.label}
            </span>
            {lead.hasUnreadMessages ? <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Não lida</span> : null}
            {nextActionState.overdue ? <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Atrasada</span> : null}
            {!nextActionState.overdue && nextActionState.today ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Hoje</span> : null}
            {lead.visitDate ? <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">{visitDateLabel}{lead.visitTime ? ` • ${lead.visitTime}` : ""}</span> : null}
          </div>
          {priceLabel ? <p className="mt-2 text-[13px] font-bold text-teal-700">{priceLabel}</p> : null}
          {lead.nextActionNote ? <p className="mt-2 line-clamp-2 text-[11px] text-gray-600">Próxima ação: {lead.nextActionNote}</p> : null}
          {!lead.nextActionNote && lead.lastMessagePreview ? <p className="mt-2 line-clamp-2 text-[11px] text-gray-600">{lead.lastMessageFromClient ? "Cliente: " : "Você: "}{lead.lastMessagePreview}</p> : null}
          {!lead.nextActionNote && !lead.lastMessagePreview && lead.outcomeDescription ? <p className="mt-2 line-clamp-2 text-[11px] text-gray-600">{lead.outcomeDescription}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
              <Clock3 className="w-3 h-3" />
              {stageAgeDays}d na etapa
            </span>
            {staleLead ? <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">48h sem contato</span> : null}
            {lead.outcomeReason ? <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">{lead.outcomeReason}</span> : null}
          </div>
        </div>

        <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
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
    </div>
  );
}
