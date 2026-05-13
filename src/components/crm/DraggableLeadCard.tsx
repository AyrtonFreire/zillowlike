"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import Image from "next/image";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarClock,
  Clock3,
  Loader2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
} from "lucide-react";
import { getLeadNextActionState, getLeadStageAgeDays, getLeadTemperature, getStaleSeverity, getStaleSeverityLabel } from "@/lib/lead-operational-signals";

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
      phone?: string | null;
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

const TEMPERATURE_AVATAR: Record<"hot" | "warm" | "cool", { bg: string; ring: string; label: string }> = {
  hot: { bg: "bg-gradient-to-br from-rose-400 to-rose-600", ring: "ring-rose-200", label: "Quente" },
  warm: { bg: "bg-gradient-to-br from-amber-400 to-amber-500", ring: "ring-amber-200", label: "Em jogo" },
  cool: { bg: "bg-gradient-to-br from-slate-400 to-slate-500", ring: "ring-slate-200", label: "Frio" },
};

function getInitials(name: string | null | undefined): string {
  const text = String(name || "").trim();
  if (!text) return "?";
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (first + last).toUpperCase() || "?";
}

function buildWhatsappUrl(phone: string | null | undefined): string | null {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}

interface IconActionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  href?: string | null;
  external?: boolean;
  disabled?: boolean;
  active?: boolean;
}

function IconAction({ icon: Icon, label, onClick, href, external, disabled, active }: IconActionProps) {
  const baseClass = `inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    active ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
  }`;
  if (href && !disabled) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        title={label}
        aria-label={label}
        className={baseClass}
      >
        <Icon className="h-4 w-4" />
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onPointerDown={(e) => e.stopPropagation()}
      title={label}
      aria-label={label}
      className={baseClass}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
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
  const nextActionState = getLeadNextActionState(lead, now);
  const stageAgeDays = getLeadStageAgeDays(lead, now);
  const leadTemperature = getLeadTemperature(lead, now);
  const staleSeverity = getStaleSeverity(lead, now);
  const staleLabel = getStaleSeverityLabel(staleSeverity);
  const hasNextAction = !!lead.nextActionDate || !!lead.nextActionNote;

  const priceLabel =
    typeof lead.property.price === "number"
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(lead.property.price / 100)
      : null;

  const visitDateLabel = lead.visitDate
    ? new Date(lead.visitDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;
  const visitLabel = visitDateLabel ? `${visitDateLabel}${lead.visitTime ? ` • ${lead.visitTime}` : ""}` : null;

  const contactName = lead.contact?.name || "Lead sem nome";
  const initials = getInitials(contactName);
  const tempMeta = TEMPERATURE_AVATAR[leadTemperature];

  const nextActionAt = lead.nextActionDate ? new Date(lead.nextActionDate) : null;
  const nextActionTone: "rose" | "amber" | "slate" = nextActionState.overdue
    ? "rose"
    : nextActionState.today
      ? "amber"
      : "slate";
  const nextActionLabel = nextActionState.overdue
    ? "Atrasada"
    : nextActionState.today
      ? "Hoje"
      : nextActionAt
        ? nextActionAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        : null;
  const nextActionText = lead.nextActionNote || (visitLabel ? `Confirmar visita ${visitLabel}` : null);
  const nextActionToneClasses: Record<typeof nextActionTone, string> = {
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };
  const nextActionIconClass: Record<typeof nextActionTone, string> = {
    rose: "text-rose-600",
    amber: "text-amber-600",
    slate: "text-slate-500",
  };
  const showNextActionBlock = !!nextActionText && (lead.pipelineStage !== "WON" && lead.pipelineStage !== "LOST");

  const whatsappUrl = buildWhatsappUrl(lead.contact?.phone);
  const isClosed = lead.pipelineStage === "WON" || lead.pipelineStage === "LOST";

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0 : 1,
  };

  const dragProps = !dragDisabled ? { ...listeners, ...attributes } : {};

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
        className={`flex flex-col gap-3 overflow-hidden rounded-[20px] border bg-white p-3.5 text-slate-900 transition-all duration-150 will-change-transform md:p-4 ${
          isDragging
            ? "border-teal-400 shadow-xl"
            : "border-slate-200 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.35)] hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-[0_12px_32px_-22px_rgba(15,23,42,0.28)]"
        }`}
      >
        {/* Header: avatar + nome + temperatura */}
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

          <div className="relative shrink-0">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${tempMeta.bg} text-sm font-semibold text-white shadow-sm ring-2 ${tempMeta.ring} md:h-11 md:w-11`}
              aria-label={`Avatar ${contactName} (${tempMeta.label})`}
            >
              {initials}
            </div>
            {lead.hasUnreadMessages ? (
              <span
                className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500"
                aria-label="Mensagens não lidas"
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-[14px] font-semibold leading-tight text-slate-950 md:text-[15px]">{contactName}</p>
              {showAdvanceButton && !isClosed && (
                <button
                  type="button"
                  onClick={onAdvance}
                  disabled={isUpdating || selectionMode}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="inline-flex h-7 shrink-0 items-center rounded-lg bg-emerald-600 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Avançar para próxima etapa"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Movendo
                    </>
                  ) : (
                    "Avançar →"
                  )}
                </button>
              )}
            </div>

            {/* Imóvel: thumbnail + título + preço */}
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-slate-100">
                <Image src={lead.property.images[0]?.url || "/placeholder.jpg"} alt="" fill className="object-cover" sizes="28px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] text-slate-700">{lead.property.title}</p>
                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                  {priceLabel ? <span className="font-semibold text-teal-700">{priceLabel}</span> : null}
                  {priceLabel ? <span className="text-slate-300">·</span> : null}
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {lead.property.neighborhood ? `${lead.property.neighborhood}, ` : ""}
                    {lead.property.city}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Próxima ação destacada */}
        {showNextActionBlock ? (
          <div className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${nextActionToneClasses[nextActionTone]}`}>
            {nextActionTone === "rose" ? (
              <AlertTriangle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${nextActionIconClass[nextActionTone]}`} />
            ) : visitLabel ? (
              <CalendarClock className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${nextActionIconClass[nextActionTone]}`} />
            ) : (
              <Clock3 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${nextActionIconClass[nextActionTone]}`} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                Próxima ação{nextActionLabel ? ` · ${nextActionLabel}` : ""}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug">{nextActionText}</p>
            </div>
          </div>
        ) : null}

        {/* Última mensagem */}
        {lead.lastMessagePreview ? (
          <p className="line-clamp-1 text-[12px] leading-5 text-slate-600">
            <span className="text-slate-400">{lead.lastMessageFromClient ? "Cliente:" : "Você:"}</span>{" "}
            {lead.lastMessagePreview}
          </p>
        ) : isClosed && lead.outcomeReason ? (
          <p className="line-clamp-2 text-[12px] leading-5 text-slate-600">
            <span className="font-semibold text-slate-700">
              {lead.pipelineStage === "WON" ? "Ganho" : "Perdido"}:
            </span>{" "}
            {lead.outcomeReason}
            {lead.outcomeDescription ? ` — ${lead.outcomeDescription}` : ""}
          </p>
        ) : null}

        {/* Footer: quick actions + metadata */}
        {!selectionMode ? (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-0.5">
              {onOpenChat ? (
                <IconAction icon={MessageCircle} label="Abrir chat" onClick={onOpenChat} active={lead.hasUnreadMessages} />
              ) : null}
              <IconAction
                icon={Phone}
                label={whatsappUrl ? "WhatsApp" : "Sem telefone cadastrado"}
                href={whatsappUrl}
                external
                disabled={!whatsappUrl}
              />
              {onToggleReminder ? (
                <IconAction
                  icon={hasNextAction ? BellOff : Bell}
                  label={hasNextAction ? "Remover lembrete" : "Adicionar lembrete"}
                  onClick={onToggleReminder}
                  disabled={isReminderUpdating}
                  active={hasNextAction}
                />
              ) : null}
              {onOpenLead ? (
                <IconAction icon={MoreHorizontal} label="Ver detalhes" onClick={onOpenLead} />
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Clock3 className="h-3 w-3" />
              <span className="tabular-nums">{stageAgeDays}d</span>
              {staleSeverity !== "fresh" && !isClosed ? (
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    staleSeverity === "critical"
                      ? "bg-rose-50 text-rose-700"
                      : staleSeverity === "risk"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {staleLabel}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
