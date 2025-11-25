"use client";

import { useState, useEffect } from "react";
import { 
  Clock, 
  MessageCircle, 
  FileText, 
  Phone, 
  Calendar,
  CheckCircle,
  XCircle,
  ArrowRight,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "created" | "status_change" | "note" | "message" | "reminder" | "stage_change";
  title: string;
  description?: string;
  date: string;
  icon?: "clock" | "message" | "note" | "phone" | "calendar" | "check" | "x" | "arrow" | "user";
  metadata?: Record<string, any>;
}

interface LeadTimelineProps {
  leadId: string;
  createdAt: string;
  respondedAt?: string | null;
  completedAt?: string | null;
  pipelineStage?: string;
  notes?: Array<{ id: string; content: string; createdAt: string }>;
  messages?: Array<{ id: string; content: string; createdAt: string; senderId?: string }>;
}

const iconMap = {
  clock: Clock,
  message: MessageCircle,
  note: FileText,
  phone: Phone,
  calendar: Calendar,
  check: CheckCircle,
  x: XCircle,
  arrow: ArrowRight,
  user: User,
};

const stageLabels: Record<string, string> = {
  NEW: "Novo",
  CONTACT: "Em contato",
  VISIT: "Visita",
  PROPOSAL: "Proposta",
  DOCUMENTS: "Documentação",
  WON: "Fechado",
  LOST: "Perdido",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return formatDate(iso);
}

export default function LeadTimeline({
  leadId,
  createdAt,
  respondedAt,
  completedAt,
  pipelineStage,
  notes = [],
  messages = [],
}: LeadTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const allEvents: TimelineEvent[] = [];

    // Evento de criação
    allEvents.push({
      id: "created",
      type: "created",
      title: "Lead criado",
      description: "O cliente demonstrou interesse no imóvel",
      date: createdAt,
      icon: "user",
    });

    // Evento de resposta
    if (respondedAt) {
      allEvents.push({
        id: "responded",
        type: "status_change",
        title: "Lead aceito",
        description: "Você assumiu este lead para atendimento",
        date: respondedAt,
        icon: "check",
      });
    }

    // Notas
    notes.forEach((note) => {
      allEvents.push({
        id: `note-${note.id}`,
        type: "note",
        title: "Nota adicionada",
        description: note.content.length > 100 ? note.content.substring(0, 100) + "..." : note.content,
        date: note.createdAt,
        icon: "note",
      });
    });

    // Mensagens (últimas 5)
    const recentMessages = messages.slice(-5);
    recentMessages.forEach((msg) => {
      allEvents.push({
        id: `msg-${msg.id}`,
        type: "message",
        title: "Mensagem enviada",
        description: msg.content.length > 80 ? msg.content.substring(0, 80) + "..." : msg.content,
        date: msg.createdAt,
        icon: "message",
      });
    });

    // Evento de conclusão
    if (completedAt) {
      allEvents.push({
        id: "completed",
        type: "status_change",
        title: pipelineStage === "WON" ? "Negócio fechado! 🎉" : "Atendimento concluído",
        description: pipelineStage === "WON" 
          ? "Parabéns! O negócio foi concluído com sucesso."
          : "O atendimento deste lead foi finalizado.",
        date: completedAt,
        icon: pipelineStage === "WON" ? "check" : "x",
      });
    }

    // Ordenar por data (mais recente primeiro)
    allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setEvents(allEvents);
  }, [leadId, createdAt, respondedAt, completedAt, pipelineStage, notes, messages]);

  const visibleEvents = isExpanded ? events : events.slice(0, 4);
  const hasMore = events.length > 4;

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Histórico de atividades</h3>
        <span className="text-[11px] text-gray-500">{events.length} evento{events.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="relative">
        {/* Linha vertical conectando os eventos */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {visibleEvents.map((event, index) => {
            const Icon = iconMap[event.icon || "clock"];
            const isFirst = index === 0;

            return (
              <div key={event.id} className="relative flex gap-4">
                {/* Ícone */}
                <div
                  className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    event.type === "created"
                      ? "bg-blue-100 text-blue-600"
                      : event.type === "status_change" && event.icon === "check"
                      ? "bg-green-100 text-green-600"
                      : event.type === "status_change" && event.icon === "x"
                      ? "bg-red-100 text-red-600"
                      : event.type === "note"
                      ? "bg-yellow-100 text-yellow-600"
                      : event.type === "message"
                      ? "bg-purple-100 text-purple-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${isFirst ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                      {event.title}
                    </p>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">
                      {formatRelativeTime(event.date)}
                    </span>
                  </div>
                  {event.description && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botão para expandir/recolher */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver mais {events.length - 4} evento{events.length - 4 !== 1 ? "s" : ""}
            </>
          )}
        </button>
      )}
    </div>
  );
}
