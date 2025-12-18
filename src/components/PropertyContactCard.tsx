"use client";

import { useMemo, useState } from "react";
import { User, Building2, Calendar, Clock, CheckCircle, MessageCircle, Mail, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import { useToast } from "@/contexts/ToastContext";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M19.11 17.29c-.28-.14-1.67-.82-1.93-.92-.26-.09-.45-.14-.64.14-.19.28-.74.92-.91 1.11-.17.19-.33.21-.61.07-.28-.14-1.18-.43-2.25-1.38-.83-.74-1.39-1.65-1.56-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.19-.28.28-.47.09-.19.05-.36-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.46-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.28-1 1-1 2.43 0 1.43 1.02 2.81 1.16 3 .14.19 2.01 3.07 4.87 4.31.68.29 1.2.46 1.61.59.68.21 1.29.18 1.78.11.54-.08 1.67-.68 1.9-1.34.24-.66.24-1.22.17-1.34-.07-.12-.26-.19-.54-.33z"
      />
      <path
        fill="currentColor"
        d="M16.02 3C9.39 3 4 8.39 4 15.02c0 2.1.55 4.16 1.6 5.98L4 29l8.2-1.55c1.76.96 3.75 1.47 5.82 1.47 6.63 0 12.02-5.39 12.02-12.02C30.04 8.39 22.65 3 16.02 3zm0 23.7c-1.88 0-3.71-.5-5.31-1.44l-.38-.22-4.87.92.92-4.75-.25-.4a10.64 10.64 0 0 1-1.63-5.79c0-5.88 4.78-10.66 10.66-10.66 5.88 0 10.66 4.78 10.66 10.66 0 5.88-4.78 10.68-10.66 10.68z"
      />
    </svg>
  );
}

type ContactCardProps = {
  propertyId: string;
  propertyTitle: string;
  propertyPurpose?: "SALE" | "RENT";
  
  // Owner/Realtor info
  ownerRole: "USER" | "OWNER" | "REALTOR" | "AGENCY" | "ADMIN";
  ownerName?: string;
  ownerImage?: string;
  ownerPhone?: string;
  ownerPublicProfileEnabled?: boolean;
  ownerPublicSlug?: string | null;
  ownerPublicPhoneOptIn?: boolean;
  hideOwnerContact?: boolean;
  
  // Lead board control
  allowRealtorBoard: boolean; // true = vai para mural de leads, false = contato direto
};

// Tela de sucesso após envio
function SuccessScreen({ 
  chatUrl, 
  userEmail, 
  isLeadBoard,
  onReset,
  onOpenChat,
}: { 
  chatUrl: string; 
  userEmail: string;
  isLeadBoard: boolean;
  onReset: () => void;
  onOpenChat: (chatUrl: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-4"
    >
      {/* Ícone de sucesso */}
      <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {isLeadBoard ? "Visita Solicitada!" : "Mensagem Enviada!"}
      </h3>
      
      <p className="text-gray-600 mb-6">
        {isLeadBoard 
          ? "O responsável pelo imóvel receberá sua solicitação e poderá confirmar o horário."
          : "O responsável pelo imóvel foi notificado e entrará em contato em breve."
        }
      </p>

      {/* Card do Chat */}
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Continue pelo Chat</p>
            <p className="text-xs text-gray-600">Acompanhe e envie mensagens</p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => onOpenChat(chatUrl)}
          className="flex items-center justify-center gap-2 w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors"
        >
          Abrir Chat
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Info do email */}
      <div className="flex items-center gap-2 text-sm text-gray-500 justify-center mb-6">
        <Mail className="w-4 h-4" />
        <span>Link do chat enviado para {userEmail}</span>
      </div>

      {/* Próximos passos */}
      <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Próximos Passos</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-teal-700">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Aguarde o retorno</p>
              <p className="text-xs text-gray-500">O responsável será notificado agora</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-teal-700">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Acompanhe pelo chat</p>
              <p className="text-xs text-gray-500">Use o link acima para trocar mensagens</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-teal-700">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Agende a visita</p>
              <p className="text-xs text-gray-500">Combine um horário para conhecer o imóvel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botão para enviar outra mensagem */}
      <button
        type="button"
        onClick={onReset}
        className="text-sm text-gray-500 hover:text-teal-600 transition-colors"
      >
        Enviar outra mensagem
      </button>
    </motion.div>
  );
}

export default function PropertyContactCard({
  propertyId,
  propertyTitle,
  propertyPurpose,
  ownerRole,
  ownerName,
  ownerImage,
  ownerPublicProfileEnabled,
  ownerPublicSlug,
  ownerPublicPhoneOptIn,
  hideOwnerContact,
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
  const [successData, setSuccessData] = useState<{ chatUrl: string; email: string } | null>(null);
  const toast = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [pendingChatUrl, setPendingChatUrl] = useState<string | null>(null);

  const isAuthenticated = !!session;

  // Determinar cenário
  const isRealtorOrAgency = ownerRole === "REALTOR" || ownerRole === "AGENCY";
  const isDirectOwner = (ownerRole === "OWNER" || ownerRole === "USER") && !allowRealtorBoard;
  const isLeadBoard = (ownerRole === "OWNER" || ownerRole === "USER") && allowRealtorBoard;
  const hasPublicProfile =
    (isRealtorOrAgency && !!ownerPublicSlug) ||
    (!isRealtorOrAgency && !!ownerPublicProfileEnabled && !!ownerPublicSlug);

  const canShowWhatsApp = useMemo(() => {
    // Para corretores/imobiliárias: se houver opt-in no perfil, respeita; caso contrário, esconde.
    if (isRealtorOrAgency) return !!ownerPublicPhoneOptIn;
    if (hideOwnerContact) return false;
    // Para pessoa física: o controle é por imóvel (hideOwnerContact).
    return true;
  }, [hideOwnerContact, isRealtorOrAgency, ownerPublicPhoneOptIn]);

  const handleWhatsAppClick = async () => {
    try {
      if (!canShowWhatsApp) {
        toast.info("Contato via WhatsApp não está disponível para este anúncio.");
        return;
      }

      const res = await fetch(`/api/properties/${propertyId}/whatsapp`, { method: "GET" });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        toast.error("WhatsApp indisponível no momento.");
        return;
      }

      const url = data?.whatsappUrl as string | undefined;
      if (!url) {
        toast.error("WhatsApp indisponível no momento.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("WhatsApp indisponível no momento.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      toast.warning("Por favor, aceite os Termos de Uso e Política de Privacidade");
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
      
      const data = await res.json();
      
      // Construir chatUrl
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const chatUrl = data.chatUrl || (data.chatToken ? `${siteUrl}/chat/${data.chatToken}` : '');
      
      // Mostrar tela de sucesso
      setSuccessData({ 
        chatUrl, 
        email: formData.email 
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (chatUrl: string) => {
    if (!chatUrl) return;
    if (isAuthenticated) {
      router.push(chatUrl);
      return;
    }
    setPendingChatUrl(chatUrl);
    setShowLoginOverlay(true);
  };

  // Gerar horários disponíveis (7h-19h) em intervalos de 1h
  const availableTimes = [] as string[];
  for (let h = 7; h <= 18; h++) {
    availableTimes.push(`${h.toString().padStart(2, "0")}:00`);
  }

  // Função para resetar o formulário
  const handleReset = () => {
    setSuccessData(null);
    setFormData({ name: "", email: "", phone: "", message: `Tenho interesse em\n${propertyTitle}` });
    setVisitData({ date: "", time: "" });
    setAgreeTerms(false);
  };

  // Mostrar tela de sucesso se houver dados
  if (successData) {
    return (
      <div className="rounded-xl border border-teal/10 p-6 bg-white shadow-sm relative">
        <SuccessScreen 
          chatUrl={successData.chatUrl}
          userEmail={successData.email}
          isLeadBoard={isLeadBoard}
          onReset={handleReset}
          onOpenChat={handleOpenChat}
        />

        {showLoginOverlay && pendingChatUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Entre ou crie sua conta para usar o chat
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Para acompanhar respostas e continuar a conversa sobre este imóvel, você precisa estar logado.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => pendingChatUrl && signIn(undefined, { callbackUrl: pendingChatUrl })}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
                >
                  Entrar / Criar conta
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoginOverlay(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 mt-1"
                >
                  Agora não
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-teal/10 p-6 bg-white shadow-sm">
      {/* Header: foto/logo do corretor/imobiliária (se aplicável) */}
      {isRealtorOrAgency && ownerName && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          {hasPublicProfile ? (
            <Link
              href={`/realtor/${ownerPublicSlug}`}
              className="flex items-center gap-3 rounded-lg -mx-1 px-1 hover:bg-teal/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-light focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
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
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
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
              </div>
            </div>
          )}

          {canShowWhatsApp && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleWhatsAppClick}
              leftIcon={
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-accent/10 border border-accent/15 text-accent">
                  <WhatsAppIcon className="w-5 h-5" />
                </span>
              }
              rightIcon={<ExternalLink className="w-4 h-4 text-neutral-500" />}
              className="mt-3 w-full justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 hover:bg-neutral-50 hover:shadow-sm focus-visible:ring-accent/25"
            >
              Conversar no WhatsApp
            </Button>
          )}
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
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-light focus:border-transparent text-base"
        />
        <input
          type="email"
          placeholder="E-mail"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-light focus:border-transparent text-base"
        />
        
        {/* Phone com country code */}
        <div className="flex gap-2">
          <select className="w-24 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-light focus:border-transparent text-base">
            <option>+55</option>
          </select>
          <input
            type="tel"
            placeholder="Telefone"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-light focus:border-transparent text-base"
          />
        </div>

        {/* Mensagem (apenas se não for lead board) */}
        {!isLeadBoard && (
          <textarea
            rows={4}
            placeholder={formData.message}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-light focus:border-transparent resize-none text-base"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-light focus:border-transparent text-base"
            />
            
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                required
                value={visitData.time}
                onChange={(e) => setVisitData({ ...visitData, time: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-light focus:border-transparent appearance-none text-base"
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
          className="w-full glass-teal py-3 text-base"
          disabled={loading}
        >
          {loading ? "Enviando..." : isLeadBoard ? "Solicitar Visita" : "Entrar em Contato"}
        </Button>

        {/* Checkboxes */}
        <div className="space-y-3 text-sm text-gray-600">
          {!isLeadBoard && (
            <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input 
                type="checkbox" 
                className="mt-0.5 w-5 h-5 rounded"
                checked={notifySimilar}
                onChange={(e) => setNotifySimilar(e.target.checked)}
              />
              <span>Notificar-me por e-mail sobre imóveis similares</span>
            </label>
          )}
          <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input 
              type="checkbox" 
              className="mt-0.5 w-5 h-5 rounded"
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
