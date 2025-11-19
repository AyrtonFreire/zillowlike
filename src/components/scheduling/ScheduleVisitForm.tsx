"use client";

import { useState } from "react";
import { Calendar, User, Mail, Phone, MessageSquare } from "lucide-react";
import TimeSlotPicker from "./TimeSlotPicker";

interface ScheduleVisitFormProps {
  propertyId: string;
  onSuccess?: () => void;
}

export default function ScheduleVisitForm({
  propertyId,
  onSuccess,
}: ScheduleVisitFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTime) {
      setError("Antes de continuar, selecione um horário que funcione para você.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.notes,
          visitDate: selectedDate.toISOString(),
          visitTime: selectedTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não conseguimos agendar a visita agora.");
      }

      // Sucesso!
      if (onSuccess) {
        onSuccess();
      } else {
        alert("Visita agendada com sucesso! Você receberá uma confirmação por email.");
        window.location.reload();
      }
    } catch (err: any) {
      setError(err?.message || "Não conseguimos agendar agora. Se quiser, tente de novo em alguns instantes.");
    } finally {
      setLoading(false);
    }
  };

  // Gerar próximos 14 dias
  const generateDateOptions = () => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dateOptions = generateDateOptions();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seletor de Data */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          📅 Escolha o dia da visita
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {dateOptions.slice(0, 10).map((date) => {
            const isSelected =
              date.toDateString() === selectedDate.toDateString();
            const dayName = date.toLocaleDateString("pt-BR", {
              weekday: "short",
            });
            const dayNum = date.getDate();
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedTime(null); // Reset time when date changes
                }}
                className={`
                  px-3 py-3 rounded-lg border-2 transition-all
                  ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-200 hover:border-blue-300 text-gray-700"
                  }
                `}
              >
                <div className="text-xs font-medium capitalize">
                  {isToday ? "Hoje" : dayName}
                </div>
                <div className="text-lg font-bold">{dayNum}</div>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Se precisar, você pode combinar outro dia ou horário depois diretamente com o corretor.
        </p>
      </div>

      {/* Seletor de Horário */}
      <TimeSlotPicker
        propertyId={propertyId}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onTimeSelect={setSelectedTime}
      />

      {/* Formulário de Contato */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          👤 Seus dados para contato
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações (opcional)
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                placeholder="Ex: Tenho interesse em financiar"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !selectedTime}
        className="w-full py-3 px-6 glass-teal disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Agendando...
          </span>
        ) : (
          "✅ Agendar Visita"
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Ao agendar, você receberá uma confirmação por email quando um corretor
        aceitar sua visita.
      </p>
    </form>
  );
}
