"use client";

import { useState } from "react";
import { User, Building2, Calendar, Clock } from "lucide-react";
import Image from "next/image";
import Button from "./ui/Button";

type ContactCardProps = {
  propertyId: string;
  propertyTitle: string;
  propertyPurpose?: "SALE" | "RENT";
  
  // Owner/Realtor info
  ownerRole: "USER" | "OWNER" | "REALTOR" | "AGENCY" | "ADMIN";
  ownerName?: string;
  ownerImage?: string;
  ownerPhone?: string;
  
  // Lead board control
  allowRealtorBoard: boolean; // true = vai para mural de leads, false = contato direto
};

export default function PropertyContactCard({
  propertyId,
  propertyTitle,
  propertyPurpose,
  ownerRole,
  ownerName,
  ownerImage,
  ownerPhone,
  allowRealtorBoard,
}: ContactCardProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: `Tenho interesse em\n${propertyTitle}`,
  });
  
  const [visitData, setVisitData] = useState({
    date: "",
    time: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [notifySimilar, setNotifySimilar] = useState(false);

  // Determinar cenário
  const isRealtorOrAgency = ownerRole === "REALTOR" || ownerRole === "AGENCY";
  const isDirectOwner = (ownerRole === "OWNER" || ownerRole === "USER") && !allowRealtorBoard;
  const isLeadBoard = (ownerRole === "OWNER" || ownerRole === "USER") && allowRealtorBoard;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      alert("Por favor, aceite os Termos de Uso e Política de Privacidade");
      return;
    }
    
    setLoading(true);
    try {
      const payload: any = {
        propertyId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        isDirect: !isLeadBoard,
      };

      // Se for lead board, adicionar dados de visita
      if (isLeadBoard && visitData.date && visitData.time) {
        payload.visitDate = visitData.date;
        payload.visitTime = visitData.time;
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao enviar solicitação");
      
      alert(isLeadBoard 
        ? "Solicitação de visita enviada! Em breve um corretor entrará em contato."
        : "Mensagem enviada com sucesso!"
      );
      
      // Reset form
      setFormData({ name: "", email: "", phone: "", message: `Tenho interesse em\n${propertyTitle}` });
      setVisitData({ date: "", time: "" });
      setAgreeTerms(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Gerar horários disponíveis (7h-19h) em intervalos de 1h
  const availableTimes = [] as string[];
  for (let h = 7; h <= 18; h++) {
    availableTimes.push(`${h.toString().padStart(2, "0")}:00`);
  }

  return (
    <div className="rounded-xl border border-teal/10 p-6 bg-white shadow-sm">
      {/* Header: foto/logo do corretor/imobiliária (se aplicável) */}
      {isRealtorOrAgency && ownerName && (
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
          {ownerImage ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-teal/20">
              <Image src={ownerImage} alt={ownerName} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal/20 to-teal/40 flex items-center justify-center">
              {ownerRole === "AGENCY" ? (
                <Building2 className="w-8 h-8 text-teal" />
              ) : (
                <User className="w-8 h-8 text-teal" />
              )}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{ownerName}</p>
            <p className="text-sm text-gray-600">
              {ownerRole === "AGENCY" ? "Imobiliária" : "Corretor"}
            </p>
            {ownerPhone && (
              <button 
                onClick={() => window.open(`tel:${ownerPhone}`)}
                className="text-sm text-teal hover:text-teal-dark mt-1"
              >
                📞 Mostrar telefone
              </button>
            )}
          </div>
        </div>
      )}

      {/* Título do card */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {isLeadBoard ? "Agendar Visita" : "Entre em Contato"}
      </h3>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Nome"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent"
        />
        <input
          type="email"
          placeholder="E-mail"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent"
        />
        
        {/* Phone com country code */}
        <div className="flex gap-2">
          <select className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent">
            <option>+55</option>
          </select>
          <input
            type="tel"
            placeholder="Telefone"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent"
          />
        </div>

        {/* Mensagem (apenas se não for lead board) */}
        {!isLeadBoard && (
          <textarea
            rows={4}
            placeholder={formData.message}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent resize-none"
          />
        )}

        {/* Calendário de agendamento (apenas para lead board) */}
        {isLeadBoard && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Calendar className="w-4 h-4" />
              <span>Escolha a data e horário desejados:</span>
            </div>
            
            <input
              type="date"
              required
              value={visitData.date}
              onChange={(e) => setVisitData({ ...visitData, date: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent"
            />
            
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                required
                value={visitData.time}
                onChange={(e) => setVisitData({ ...visitData, time: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-light focus:border-transparent appearance-none"
              >
                <option value="">Selecione o horário</option>
                {availableTimes.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            
            <p className="text-xs text-gray-500">
              ⏰ Horários disponíveis: Segunda a Sábado, 7h às 19h (duração de 1h)
            </p>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full glass-teal"
          disabled={loading}
        >
          {loading ? "Enviando..." : isLeadBoard ? "Solicitar Visita" : "Entrar em Contato"}
        </Button>

        {/* Checkboxes */}
        <div className="space-y-2 text-xs text-gray-600">
          {!isLeadBoard && (
            <label className="flex items-start gap-2">
              <input 
                type="checkbox" 
                className="mt-0.5"
                checked={notifySimilar}
                onChange={(e) => setNotifySimilar(e.target.checked)}
              />
              <span>Notificar-me por e-mail sobre imóveis similares</span>
            </label>
          )}
          <label className="flex items-start gap-2">
            <input 
              type="checkbox" 
              className="mt-0.5"
              required
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span>Concordo com os Termos de Uso e Política de Privacidade</span>
          </label>
        </div>
      </form>
    </div>
  );
}
