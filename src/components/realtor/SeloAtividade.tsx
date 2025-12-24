"use client";

import Badge from "@/components/ui/Badge";
import Tooltip from "@/components/ui/Tooltip";

type Props = {
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string | null;
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

export default function SeloAtividade({ status, lastActivity }: Props) {
  const normalized = (status || "").toString().toUpperCase();
  const last = toDate(lastActivity);

  const { label, variant } =
    normalized === "ACTIVE"
      ? { label: "Ativo", variant: "success" as const }
      : normalized === "INACTIVE"
        ? { label: "Inativo", variant: "muted" as const }
        : normalized === "SUSPENDED"
          ? { label: "Suspenso", variant: "danger" as const }
          : { label: normalized ? normalized : "—", variant: "muted" as const };

  const tooltip = last
    ? `Última atividade: ${last.toLocaleString("pt-BR")} (${timeAgoLabel(last)})`
    : "Sem registro de última atividade";

  return (
    <Tooltip content={tooltip}>
      <span className="inline-flex">
        <Badge variant={variant}>{label}</Badge>
      </span>
    </Tooltip>
  );
}
