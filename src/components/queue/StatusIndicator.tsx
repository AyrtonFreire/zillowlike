import { Circle } from "lucide-react";

type Status = "AVAILABLE" | "RESERVED" | "ACCEPTED" | "PENDING" | "REJECTED" | "EXPIRED";

interface StatusIndicatorProps {
  status: Status;
  showLabel?: boolean;
}

const statusConfig = {
  AVAILABLE: {
    color: "text-green-600",
    bgColor: "bg-green-50",
    label: "Disponível",
    icon: "🟢",
  },
  RESERVED: {
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    label: "Reservado",
    icon: "🟠",
  },
  ACCEPTED: {
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    label: "Em atendimento",
    icon: "🔵",
  },
  PENDING: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    label: "Pendente",
    icon: "🟡",
  },
  REJECTED: {
    color: "text-red-600",
    bgColor: "bg-red-50",
    label: "Recusado",
    icon: "🔴",
  },
  EXPIRED: {
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    label: "Expirado",
    icon: "⚫",
  },
};

export default function StatusIndicator({ status, showLabel = true }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.bgColor}`}>
      <Circle className={`w-2 h-2 fill-current ${config.color}`} />
      {showLabel && (
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}
