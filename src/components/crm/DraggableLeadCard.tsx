"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ChevronRight, Loader2, MessageCircle, Bell, BellOff, AlertTriangle, CalendarClock, Clock3, Flame } from "lucide-react";
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
  const visitLabel = visitDateLabel ? `${visitDateLabel}${lead.visitTime ? ` • ${lead.visitTime}` : ""}` : null;
  const temperatureMeta =
    leadTemperature === "hot"
      ? { label: "Quente", className: "border-rose-200 bg-rose-50 text-rose-700" }
      : leadTemperature === "warm"
        ? { label: "Em jogo", className: "border-amber-200 bg-amber-50 text-amber-700" }
        : { label: "Frio", className: "border-slate-200 bg-slate-50 text-slate-600" };
  const primaryLabel = lead.contact?.name || "Lead sem nome";
  const primaryInsight = lead.nextActionNote
    ? `Próxima ação: ${lead.nextActionNote}`
    : lead.lastMessagePreview
      ? `${lead.lastMessageFromClient ? "Cliente" : "Você"}: ${lead.lastMessagePreview}`
      : lead.outcomeDescription || "Sem atualização recente";
  const nextActionLabel = nextActionState.overdue
    ? "Ação atrasada"
    : nextActionState.today
      ? "Ação hoje"
      : nextActionAt
        ? `Ação ${nextActionAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
        : null;

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
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
        className={`flex flex-col gap-3 overflow-hidden rounded-[24px] border bg-white/95 p-3.5 text-slate-900 transition-all duration-150 will-change-transform md:p-4 ${
          isDragging
            ? "border-teal-400 shadow-xl"
            : "border-slate-200 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.4)] hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)]"
        }`}
      >
        <div className="flex items-start gap-3">
          {selectionMode && (
            <button
              type="button"
              onClick={onToggleSelected}
              onPointerDown={(e) => e.stopPropagation()}
              className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                selected ? "border-purple-600 bg-purple-600" : "border-slate-300 bg-white"
              }`}
              aria-label={selected ? "Desmarcar lead" : "Selecionar lead"}
            >
              <span className={`h-2.5 w-2.5 rounded-sm ${selected ? "bg-white" : "bg-transparent"}`} />
            </button>
          )}

          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100 md:h-16 md:w-16">
            <Image
              src={lead.property.images[0]?.url || "/placeholder.jpg"}
              alt={lead.property.title}
              fill
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-950 md:text-[15px] md:tracking-tight">{primaryLabel}</p>
                <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-600 md:truncate md:text-[13px]">{lead.property.title}</p>
              </div>
              {showAdvanceButton && (
                <button
                  type="button"
                  onClick={onAdvance}
                  disabled={isUpdating || selectionMode}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="inline-flex h-8 shrink-0 items-center rounded-xl bg-emerald-600 px-2.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:h-9 md:px-3 md:text-[12px]"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin md:h-4 md:w-4" />
                      Movendo...
                    </>
                  ) : (
                    "Avançar"
                  )}
                </button>
              )}
            </div>

            {priceLabel ? <p className="mt-1 text-[12px] font-semibold text-teal-700 md:text-[13px]">{priceLabel}</p> : null}

            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span className="truncate">
                {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                {lead.property.city} - {lead.property.state}
              </span>
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${temperatureMeta.className}`}>
                <Flame className="h-3 w-3" />
                {temperatureMeta.label}
              </span>
              {lead.hasUnreadMessages ? <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Não lida</span> : null}
              {nextActionLabel ? <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${isOverdue ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}><AlertTriangle className="h-3 w-3" />{nextActionLabel}</span> : null}
              {visitLabel ? <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[10px] font-semibold text-purple-700"><CalendarClock className="h-3 w-3" />{visitLabel}</span> : null}
            </div>

            <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-slate-600">{primaryInsight}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 md:mt-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                <Clock3 className="h-3 w-3" />
                {stageAgeDays}d na etapa
              </span>
              {staleLead ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">48h sem contato</span> : null}
              {lead.outcomeReason ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">{lead.outcomeReason}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/broker/leads/${lead.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center text-[11px] font-medium text-blue-600 hover:text-blue-700 md:text-[12px]"
            >
              Ver detalhes
              <ChevronRight className="ml-0.5 h-3 w-3 md:h-3.5 md:w-3.5" />
            </Link>
            {onOpenChat && !selectionMode && (
              <button
                type="button"
                onClick={onOpenChat}
                onPointerDown={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 md:text-[12px]"
              >
                <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Chat
              </button>
            )}
            {onToggleReminder && !selectionMode && (
              <button
                type="button"
                onClick={onToggleReminder}
                disabled={isReminderUpdating}
                onPointerDown={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 md:text-[12px]"
              >
                {hasNextAction ? <BellOff className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Bell className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                {isReminderUpdating ? "Salvando..." : "Lembrete"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
