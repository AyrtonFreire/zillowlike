"use client";

import Badge from "@/components/ui/Badge";
import Tooltip from "@/components/ui/Tooltip";

type Props = {
  lastActivity?: Date | string | null;
};

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeAgoLabel(date: Date) {
  const now = Date.now();
  const diffMinutes = Math.floor((now - date.getTime()) / 60000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `${diffMinutes}min atrás`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export default function SeloAtividade({ lastActivity }: Props) {
  const last = toDate(lastActivity);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const isToday = !!(last && last.getTime() >= todayStart.getTime());
  const isThisWeek = !!(last && last.getTime() >= sevenDaysAgo.getTime());

  const { label, variant } =
    isToday
      ? { label: "Ativo hoje", variant: "success" as const }
      : isThisWeek
        ? { label: "Ativo esta semana", variant: "warning" as const }
        : { label: "Pouca atividade recente", variant: "danger" as const };

  const tooltip = last
    ? `Última atividade: ${last.toLocaleString("pt-BR")} (${timeAgoLabel(last)}). Baseado em respostas a leads e atualização de anúncios.`
    : "Sem registro de última atividade. Baseado em respostas a leads e atualização de anúncios.";

  return (
    <Tooltip content={tooltip}>
      <span className="inline-flex">
        <Badge variant={variant}>{label}</Badge>
      </span>
    </Tooltip>
  );
}
