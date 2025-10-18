"use client";

import { useState } from "react";
import { Calendar, Clock, User, Mail, Phone, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import Image from "next/image";

interface Lead {
  id: string;
  visitDate: string | null;
  visitTime: string | null;
  clientNotes: string | null;
  property: {
    id: string;
    title: string;
    price: number;
    street: string;
    city: string;
    state: string;
    images: Array<{ url: string }>;
  };
  realtor: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  contact: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

interface OwnerApprovalCardProps {
  lead: Lead;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function OwnerApprovalCard({
  lead,
  onApprove,
  onReject,
}: OwnerApprovalCardProps) {
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}/owner-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Erro ao aprovar visita");
      }

      alert("Visita confirmada com sucesso!");
      if (onApprove) onApprove();
    } catch (error) {
      console.error("Error approving:", error);
      alert("Erro ao aprovar visita");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}/owner-reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (!response.ok) {
        throw new Error("Erro ao recusar visita");
      }

      alert("Horário recusado. Lead voltou ao mural.");
      setShowRejectModal(false);
      if (onReject) onReject();
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("Erro ao recusar visita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex gap-6">
            {/* Property Image */}
            <div className="flex-shrink-0">
              <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                {lead.property.images[0] && (
                  <Image
                    src={lead.property.images[0].url}
                    alt={lead.property.title}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">
                {lead.property.title}
              </h3>
              <p className="text-xl font-bold text-blue-600 mt-1">
                {formatPrice(lead.property.price)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {lead.property.street}, {lead.property.city} - {lead.property.state}
              </p>

              {/* Visit Details */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">
                    {formatDate(lead.visitDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{lead.visitTime}</span>
                </div>
              </div>

              {/* Realtor Info */}
              {lead.realtor && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    👤 Corretor
                  </h4>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{lead.realtor.name || "N/A"}</span>
                    </div>
                    {lead.realtor.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{lead.realtor.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Client Info */}
              {lead.contact && (
                <div className="mt-4 bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    👤 Cliente Interessado
                  </h4>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{lead.contact.name}</span>
                    </div>
                    {lead.contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{lead.contact.phone}</span>
                      </div>
                    )}
                  </div>
                  {lead.clientNotes && (
                    <div className="mt-2 flex gap-2 text-sm text-gray-600">
                      <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="italic">{lead.clientNotes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Aceitar Horário
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                  Recusar Horário
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Recusar Horário
            </h3>
            <p className="text-gray-600 mb-4">
              Por que você não pode aceitar este horário? (opcional)
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 resize-none"
              rows={3}
              placeholder="Ex: Já tenho compromisso nesse horário"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium rounded-lg"
              >
                {loading ? "Recusando..." : "Confirmar Recusa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
