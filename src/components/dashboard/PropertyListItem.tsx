"use client";

import Image from "next/image";
import Link from "next/link";
import { MoreVertical, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PropertyListItemProps {
  id: string;
  title: string;
  price: number;
  image: string;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  views?: number;
  leads?: number;
  scheduledVisits?: number;
  completedVisits?: number;
  pendingApprovals?: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export default function PropertyListItem({
  id,
  title,
  price,
  image,
  status,
  views = 0,
  leads = 0,
  scheduledVisits = 0,
  completedVisits = 0,
  pendingApprovals = 0,
  onEdit,
  onDelete,
  onToggleStatus,
}: PropertyListItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const statusConfig = {
    ACTIVE: { label: "Ativo", color: "bg-green-100 text-green-700" },
    PAUSED: { label: "Pausado", color: "bg-yellow-100 text-yellow-700" },
    DRAFT: { label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200">
      {/* Thumbnail */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 truncate mb-1">{title}</h4>
        <p className="text-lg font-bold text-blue-600 mb-2">
          R$ {(price / 100).toLocaleString("pt-BR")}
        </p>
        <div className="flex flex-col gap-1 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {views} views
            </span>
            <span className="flex items-center gap-1">
              📧 {leads} leads
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[status].color}`}
            >
              {statusConfig[status].label}
            </span>
          </div>
          {(scheduledVisits > 0 || completedVisits > 0 || pendingApprovals > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
              {scheduledVisits > 0 && (
                <span>
                  {scheduledVisits} visita{scheduledVisits > 1 ? "s" : ""} agendada{scheduledVisits > 1 ? "s" : ""}
                </span>
              )}
              {completedVisits > 0 && (
                <span>
                  {completedVisits} concluída{completedVisits > 1 ? "s" : ""}
                </span>
              )}
              {pendingApprovals > 0 && (
                <span>
                  {pendingApprovals} esperando sua aprovação
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <MoreVertical className="w-5 h-5 text-gray-600" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={() => {
                  onEdit?.(id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => {
                  onToggleStatus?.(id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                {status === "ACTIVE" ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Ativar
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  onDelete?.(id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
