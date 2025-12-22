"use client";

import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface LeadListItemProps {
  id: string;
  propertyTitle: string;
  contactName: string;
  contactPhone: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  createdAt: Date;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function LeadListItem({
  id,
  propertyTitle,
  contactName,
  contactPhone,
  status,
  createdAt,
  onAccept,
  onReject,
}: LeadListItemProps) {
  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    PENDING: {
      label: "Pendente",
      color: "bg-yellow-100 text-yellow-700",
      icon: AlertCircle,
    },
    RESERVED: {
      label: "Reservado",
      color: "bg-yellow-100 text-yellow-700",
      icon: AlertCircle,
    },
    ACCEPTED: {
      label: "Aceito",
      color: "bg-green-100 text-green-700",
      icon: CheckCircle,
    },
    COMPLETED: {
      label: "Concluído",
      color: "bg-green-100 text-green-700",
      icon: CheckCircle,
    },
    REJECTED: {
      label: "Recusado",
      color: "bg-red-100 text-red-700",
      icon: XCircle,
    },
    EXPIRED: {
      label: "Expirado",
      color: "bg-gray-100 text-gray-700",
      icon: Clock,
    },
  };

  const config = statusConfig[String(status)] || {
    label: String(status || "Lead"),
    color: "bg-gray-100 text-gray-700",
    icon: AlertCircle,
  };
  const StatusIcon = config.icon;

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200">
      {/* Status Icon */}
      <div className={`p-2 rounded-lg ${config.color.replace("text-", "bg-").replace("100", "50")}`}>
        <StatusIcon className={`w-5 h-5 ${config.color.split(" ")[1]}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 truncate mb-1">
          {propertyTitle}
        </h4>
        <p className="text-sm text-gray-600 mb-1">
          {contactName} • {contactPhone}
        </p>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(createdAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      {status === "PENDING" && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAccept?.(id)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Aceitar
          </button>
          <button
            onClick={() => onReject?.(id)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Recusar
          </button>
        </div>
      )}
    </div>
  );
}
