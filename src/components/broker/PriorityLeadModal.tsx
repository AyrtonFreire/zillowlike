"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User, Mail, Phone, MapPin, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import Image from "next/image";

interface PriorityLeadModalProps {
  lead: {
    id: string;
    visitDate: string | null;
    visitTime: string | null;
    reservedUntil: string | null;
    property: {
      id: string;
      title: string;
      price: number;
      street: string;
      city: string;
      state: string;
      images: Array<{ url: string }>;
    };
    contact: {
      name: string;
      email?: string;
      phone?: string | null;
    } | null;
  };
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export default function PriorityLeadModal({
  lead,
  onAccept,
  onReject,
  onClose,
}: PriorityLeadModalProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lead.reservedUntil) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(lead.reservedUntil!).getTime();
      const diff = Math.max(0, end - now);
      
      setTimeLeft(Math.floor(diff / 1000));

      if (diff <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [lead.reservedUntil, onClose]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const percentage = lead.reservedUntil 
    ? (timeLeft / 600) * 100 // 600 segundos = 10 minutos
    : 100;

  const getUrgencyColor = () => {
    if (timeLeft < 60) return "text-red-600 bg-red-100";
    if (timeLeft < 180) return "text-orange-600 bg-orange-100";
    return "text-blue-600 bg-blue-100";
  };

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

  const handleAccept = async () => {
    setLoading(true);
    await onAccept();
  };

  const handleReject = async () => {
    if (!confirm("Tem certeza que deseja recusar este lead?")) return;
    setLoading(true);
    await onReject();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200">
        {/* Header with Timer */}
        <div className={`${getUrgencyColor()} p-6 border-b-4 border-current`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-3">
                <AlertTriangle className="w-8 h-8 text-current" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">🎯 VOCÊ FOI ESCOLHIDO!</h2>
                <p className="text-sm opacity-90">Você tem prioridade para este lead</p>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="bg-white bg-opacity-90 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-700">Tempo restante:</span>
              <span className={`text-3xl font-bold ${timeLeft < 60 ? 'text-red-600 animate-pulse' : ''}`}>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  timeLeft < 60 ? 'bg-red-600' : timeLeft < 180 ? 'bg-orange-500' : 'glass-teal'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Property */}
          <div className="flex gap-4">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {lead.property.images[0] && (
                <Image
                  src={lead.property.images[0].url}
                  alt={lead.property.title}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {lead.property.title}
              </h3>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {formatPrice(lead.property.price)}
              </p>
              <div className="flex items-center gap-2 text-gray-600 mt-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">
                  {lead.property.street}, {lead.property.city} - {lead.property.state}
                </span>
              </div>
            </div>
          </div>

          {/* Visit Details */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              VISITA AGENDADA
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Data:</p>
                <p className="font-bold text-gray-900 capitalize">
                  {formatDate(lead.visitDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Horário:</p>
                <p className="text-2xl font-bold text-blue-600">
                  {lead.visitTime}
                </p>
              </div>
            </div>
          </div>

          {/* Client Info */}
          {lead.contact && (
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                CLIENTE
              </h4>
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{lead.contact.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a
                    href={`mailto:${lead.contact.email}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {lead.contact.email}
                  </a>
                </div>
                {lead.contact.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a
                      href={`tel:${lead.contact.phone}`}
                      className="hover:text-blue-600 transition-colors font-medium"
                    >
                      {lead.contact.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ Se você aceitar, o proprietário precisará aprovar o horário. Se ele recusar,
              você NÃO será penalizado e voltará para o TOP 5 da fila.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 border-t flex gap-4">
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors"
          >
            <XCircle className="w-6 h-6" />
            RECUSAR
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold text-lg rounded-xl transition-colors shadow-lg"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                ACEITAR LEAD
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
