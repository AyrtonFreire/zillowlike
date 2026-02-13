"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { 
  Phone, Mail, MapPin, Calendar, CheckCircle, XCircle, Clock, RefreshCw, 
  MessageCircle, AlertCircle, ChevronDown, ChevronRight, Filter, User,
  ExternalLink, Columns3, Users, Handshake, Trophy, X,
  Bell, PhoneOff, CalendarClock, BedDouble, Bath, Ruler, Car
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import CountdownTimer from "@/components/queue/CountdownTimer";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { canonicalToBoardGroup } from "@/lib/lead-pipeline";
import { getPusherClient } from "@/lib/pusher-client";
import { ptBR } from "@/lib/i18n/property";
import { formatPublicCode, normalizePublicCodeInput } from "@/lib/public-code";

// Tipo de imóvel traduzido
const PROPERTY_TYPES: Record<string, string> = {
  HOUSE: "Casa",
  APARTMENT: "Apartamento",
  CONDO: "Condomínio",
  TOWNHOUSE: "Sobrado",
  STUDIO: "Studio",
  LAND: "Terreno",
  RURAL: "Imóvel rural",
  COMMERCIAL: "Comercial",
};

// Pipeline simplificado: 4 grupos das 7 etapas do CRM
type PipelineStage = "NEW" | "CONTACT" | "NEGOTIATION" | "CLOSED";
type CanonicalStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";
const PIPELINE_STAGES: { id: PipelineStage; label: string; icon: any; color: string; bgColor: string }[] = [
  // Mesmas cores da coluna NEW do CRM (/broker/crm)
  { id: "NEW", label: "Novos", icon: Users, color: "text-blue-600", bgColor: "bg-blue-50" },
  // Mesmas cores da coluna CONTACT do CRM
  { id: "CONTACT", label: "Contato", icon: Phone, color: "text-amber-600", bgColor: "bg-amber-50" },
  // Agrupa VISIT/PROPOSAL/DOCUMENTS usando a cor de VISIT do CRM (roxo)
  { id: "NEGOTIATION", label: "Negociação", icon: Handshake, color: "text-purple-600", bgColor: "bg-purple-50" },
  // Agrupa WON/LOST usando a cor de WON do CRM (verde)
  { id: "CLOSED", label: "Fechado", icon: Trophy, color: "text-emerald-600", bgColor: "bg-emerald-50" },
];

const CANONICAL_STAGE_ORDER: CanonicalStage[] = [
  "NEW",
  "CONTACT",
  "VISIT",
  "PROPOSAL",
  "DOCUMENTS",
  "WON",
  "LOST",
];

const CANONICAL_STAGE_META: Record<CanonicalStage, { label: string; color: string; bgColor: string; borderColor: string }> = {
  NEW: { label: "Novos", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  CONTACT: { label: "Contato", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  VISIT: { label: "Visita", color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  PROPOSAL: { label: "Proposta", color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
  DOCUMENTS: { label: "Docs", color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  WON: { label: "Fechado", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  LOST: { label: "Perdido", color: "text-gray-500", bgColor: "bg-gray-50", borderColor: "border-gray-200" },
};

// Mapeamento de status do lead para etapa do pipeline (4 colunas agrupadas)
function getLeadPipelineStage(lead: Lead): PipelineStage {
  if (lead.status === "COMPLETED") return "CLOSED";
  // Se tem pipelineStage canônico definido, usar
  const canonicalStage = ((lead as any).pipelineStage as string | undefined) || null;
  return canonicalToBoardGroup(canonicalStage as any, lead.status) as PipelineStage;
}

interface Lead {
  id: string;
  publicCode?: string | null;
  status: "RESERVED" | "ACCEPTED" | "COMPLETED" | string;
  createdAt: string;
  reservedUntil?: string | null;
  respondedAt?: string | null;
  completedAt?: string | null;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
  lastContactAt?: string | null;
  hasUnreadMessages?: boolean;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageFromClient?: boolean;
  clientChatToken?: string | null;
  chatUrl?: string | null;
  origin?: "WHATSAPP" | "SITE_CHAT" | string;
  property: {
    id: string;
    publicCode?: string | null;
    title: string;
    price: number;
    type: string;
    city: string;
    state: string;
    neighborhood?: string | null;
    street: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaM2?: number | null;
    builtAreaM2?: number | null;
    usableAreaM2?: number | null;
    lotAreaM2?: number | null;
    privateAreaM2?: number | null;
    suites?: number | null;
    parkingSpots?: number | null;
    floor?: number | null;
    furnished?: boolean | null;
    petFriendly?: boolean | null;
    condoFee?: number | null;
    purpose?: "SALE" | "RENT" | null;
    images: Array<{ url: string }>;
  };
  contact?: {
    name: string;
    email: string;
    phone?: string | null;
  };
}

interface LeadNote {
  id: string;
  leadId: string;
  realtorId: string;
  content: string;
  createdAt: string;
}

function StageChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
        active
          ? "bg-teal-600 text-white shadow-sm"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? "bg-white/20" : "bg-gray-200"}`}>
        {count}
      </span>
    </button>
  );
}


export default function MyLeadsPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // Toggle visualização Lista/Pipeline (lendo query param `view`)
  const searchParams = useSearchParams();
  const propertyIdFromUrl = searchParams.get("propertyId");

  const normalizePipelineStageFromUrl = useCallback((value: string | null): "all" | PipelineStage => {
    const v = String(value || "").trim().toUpperCase();
    const isValid = PIPELINE_STAGES.some((s) => s.id === (v as any));
    return isValid ? (v as PipelineStage) : "all";
  }, []);

  const normalizeDateFilterFromUrl = useCallback((value: string | null): "all" | "today" | "last7" => {
    const v = String(value || "").trim().toLowerCase();
    if (v === "today" || v === "last7") return v;
    return "all";
  }, []);

  const stageFromUrl = searchParams.get("stage");
  const dateFromUrl = searchParams.get("date");

  const [pipelineFilter, setPipelineFilter] = useState<"all" | PipelineStage>(
    () => normalizePipelineStageFromUrl(stageFromUrl)
  );
  const [nameFilter, setNameFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "last7">(
    () => normalizeDateFilterFromUrl(dateFromUrl)
  );

  const [openNotesLeadId, setOpenNotesLeadId] = useState<string | null>(null);
  const [notesByLead, setNotesByLead] = useState<Record<string, LeadNote[]>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [notesLoading, setNotesLoading] = useState<Record<string, boolean>>({});
  const [notesError, setNotesError] = useState<Record<string, string | null>>({});

  const [stagePickerLeadId, setStagePickerLeadId] = useState<string | null>(null);
  const [stageUpdating, setStageUpdating] = useState<Record<string, boolean>>({});

  const [hoverPreviewLead, setHoverPreviewLead] = useState<Lead | null>(null);
  const [hoverPreviewRect, setHoverPreviewRect] = useState<DOMRect | null>(null);
  const hoverPreviewCloseTimer = useRef<number | null>(null);
  
  // Estados para UI mobile
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  const { data: session } = useSession();
  const realtorId = (session?.user as any)?.id || "";
  const toast = useToast();

  useEffect(() => {
    setPipelineFilter(normalizePipelineStageFromUrl(stageFromUrl));
  }, [stageFromUrl, normalizePipelineStageFromUrl]);

  useEffect(() => {
    setDateFilter(normalizeDateFilterFromUrl(dateFromUrl));
  }, [dateFromUrl, normalizeDateFilterFromUrl]);

  const fetchLeads = useCallback(
    async (options?: {
      isBackground?: boolean;
      append?: boolean;
      cursor?: string | null;
      preserveTail?: boolean;
    }) => {
    try {
      if (!realtorId) return;
      const append = !!options?.append;
      const preserveTail = options?.preserveTail !== false;

      if (!options?.isBackground && !append) {
        setError(null);
        setLoading(true);
      }

      if (append) {
        setLoadingMore(true);
      }

      const params = new URLSearchParams();
      params.set("paged", "1");
      params.set("limit", "40");
      if (options?.cursor) params.set("cursor", String(options.cursor));

      if (pipelineFilter !== "all") params.set("group", String(pipelineFilter));
      if (dateFilter !== "all") params.set("date", String(dateFilter));
      if (nameFilter) params.set("q", String(nameFilter));
      if (cityFilter) params.set("city", String(cityFilter));
      if (typeFilter) params.set("type", String(typeFilter));

      const response = await fetch(`/api/leads/my-leads?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não conseguimos carregar seus leads agora. Se quiser, tente novamente em alguns instantes."
        );
      }

      const nextItems = Array.isArray((data as any)?.items) ? ((data as any).items as Lead[]) : [];
      const newCursor = typeof (data as any)?.nextCursor === "string" ? (data as any).nextCursor : null;

      if (append) {
        setLeads((prev) => {
          const seen = new Set(prev.map((l) => String(l.id)));
          const merged = [...prev];
          for (const item of nextItems) {
            const id = String((item as any)?.id);
            if (!id || seen.has(id)) continue;
            seen.add(id);
            merged.push(item);
          }
          return merged;
        });
        setNextCursor(newCursor);
        return;
      }

      // Refresh/primeira página: só atualiza se houver mudança real para evitar animações desnecessárias
      setLeads((prev) => {
        if (!preserveTail) {
          return nextItems;
        }
        try {
          const prevHead = prev.slice(0, nextItems.length);
          const prevJson = JSON.stringify(prevHead);
          const nextJson = JSON.stringify(nextItems);
          if (prevJson === nextJson) {
            return prev;
          }
        } catch {
          // ignore
        }

        // Mantém itens já carregados depois da primeira página (para não "sumir" ao fazer refresh)
        const seen = new Set(nextItems.map((l) => String((l as any)?.id)));
        const tail = prev.filter((l) => !seen.has(String(l.id)));
        return [...nextItems, ...tail];
      });
      setNextCursor(newCursor);
    } catch (err: any) {
      console.error("Error fetching leads:", err);
      setError(
        err?.message ||
          "Não conseguimos carregar seus leads agora. Se quiser, tente novamente em alguns instantes."
      );
    } finally {
      if (options?.append) {
        setLoadingMore(false);
      }
      if (!options?.isBackground && !options?.append) {
        setLoading(false);
      }
    }
    },
    [realtorId, pipelineFilter, dateFilter, nameFilter, cityFilter, typeFilter]
  );

  useEffect(() => {
    if (!realtorId) return;
    // Atualiza a cada 30 segundos em background, sem flicker visual
    const interval = setInterval(() => fetchLeads({ isBackground: true }), 30000);
    return () => clearInterval(interval);
  }, [realtorId, fetchLeads]);

  useEffect(() => {
    if (!realtorId) return;
    setLeads([]);
    setNextCursor(null);
    fetchLeads({ preserveTail: false });
  }, [pipelineFilter, dateFilter, nameFilter, cityFilter, typeFilter, realtorId, fetchLeads]);

  useEffect(() => {
    if (!stagePickerLeadId) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStagePickerLeadId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stagePickerLeadId]);

  const closeHoverPreviewSoon = useCallback(() => {
    if (hoverPreviewCloseTimer.current) {
      window.clearTimeout(hoverPreviewCloseTimer.current);
    }
    hoverPreviewCloseTimer.current = window.setTimeout(() => {
      setHoverPreviewLead(null);
      setHoverPreviewRect(null);
    }, 120);
  }, []);

  const keepHoverPreviewOpen = useCallback(() => {
    if (hoverPreviewCloseTimer.current) {
      window.clearTimeout(hoverPreviewCloseTimer.current);
      hoverPreviewCloseTimer.current = null;
    }
  }, []);

  const previewNode = useMemo(() => {
    if (!hoverPreviewLead || !hoverPreviewRect) return null;
    if (typeof document === "undefined") return null;
    if (!hoverPreviewLead.property) return null;

    const maxWidth = 360;
    const margin = 12;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;

    let left = hoverPreviewRect.right + margin;
    let top = hoverPreviewRect.top;

    if (left + maxWidth + margin > vw) {
      left = Math.max(margin, hoverPreviewRect.left - maxWidth - margin);
    }

    top = Math.min(Math.max(margin, top), vh - margin - 240);

    const addressLine = [
      hoverPreviewLead.property.street,
      hoverPreviewLead.property.neighborhood,
      hoverPreviewLead.property.city ? `${hoverPreviewLead.property.city}/${hoverPreviewLead.property.state}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const mainArea =
      hoverPreviewLead.property.areaM2 ??
      hoverPreviewLead.property.usableAreaM2 ??
      hoverPreviewLead.property.builtAreaM2 ??
      hoverPreviewLead.property.privateAreaM2 ??
      null;

    const primaryMetrics: Array<{ key: string; icon: any; label: string; value: string | number | null | undefined }> = [
      { key: "beds", icon: BedDouble, label: "Quartos", value: hoverPreviewLead.property.bedrooms },
      { key: "baths", icon: Bath, label: "Banheiros", value: hoverPreviewLead.property.bathrooms },
      {
        key: "area",
        icon: Ruler,
        label: "Área",
        value: mainArea != null ? `${mainArea}m²` : null,
      },
      { key: "parking", icon: Car, label: "Vagas", value: hoverPreviewLead.property.parkingSpots },
    ].filter((m) => m.value !== null && m.value !== undefined);

    const purposeLabel =
      hoverPreviewLead.property.purpose === "SALE"
        ? "Venda"
        : hoverPreviewLead.property.purpose === "RENT"
          ? "Aluguel"
          : null;

    return createPortal(
      <div
        className="fixed z-[9999]"
        style={{ left, top, width: maxWidth }}
        onMouseEnter={keepHoverPreviewOpen}
        onMouseLeave={closeHoverPreviewSoon}
      >
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="relative h-40 bg-gray-100">
            <Image
              src={hoverPreviewLead.property.images[0]?.url || "/placeholder.jpg"}
              alt={hoverPreviewLead.property.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-4">
            <div className="text-sm font-semibold text-gray-900 line-clamp-2">
              {hoverPreviewLead.property.title}
            </div>
            <div className="text-teal-700 font-bold mt-1">{formatPrice(hoverPreviewLead.property.price)}</div>
            <div className="text-xs text-gray-600 mt-1 line-clamp-2">{addressLine}</div>
            <div className="text-xs text-gray-500 mt-1">
              {ptBR.type(hoverPreviewLead.property.type)}
              {purposeLabel ? ` • ${purposeLabel}` : ""}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {primaryMetrics.map((m) => {
                const Icon = m.icon;
                const value = m.value;
                return (
                  <span
                    key={m.key}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium"
                    title={m.label}
                  >
                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                    <span className="tabular-nums">{value}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }, [hoverPreviewLead, hoverPreviewRect, keepHoverPreviewOpen, closeHoverPreviewSoon]);

  useEffect(() => {
    if (!realtorId) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `private-realtor-${realtorId}`;
      const channel = pusher.subscribe(channelName);

      const handler = () => {
        if (cancelled) return;
        fetchLeads({ isBackground: true });
      };

      channel.bind("assistant:item_updated", handler as any);
      channel.bind("assistant:items_recalculated", handler as any);

      return () => {
        cancelled = true;
        try {
          channel.unbind("assistant:item_updated", handler as any);
          channel.unbind("assistant:items_recalculated", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      };
    } catch {
      return;
    }
  }, [realtorId, fetchLeads]);

  const fetchLeadNotes = async (leadId: string) => {
    try {
      setNotesError((prev) => ({ ...prev, [leadId]: null }));
      setNotesLoading((prev) => ({ ...prev, [leadId]: true }));

      const response = await fetch(`/api/leads/${leadId}/notes`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível carregar as notas deste lead.");
      }

      setNotesByLead((prev) => ({ ...prev, [leadId]: data.notes || [] }));
    } catch (err: any) {
      console.error("Error fetching lead notes:", err);
      setNotesError((prev) => ({
        ...prev,
        [leadId]: err?.message || "Não foi possível carregar as notas deste lead.",
      }));
    } finally {
      setNotesLoading((prev) => ({ ...prev, [leadId]: false }));
    }
  };

  const handleAccept = async (leadId: string) => {
    const confirmed = await toast.confirm({
      title: "Assumir este lead?",
      message: "Você quer assumir este lead agora? Se ainda estiver em dúvida, pode decidir mais tarde.",
      confirmText: "Sim, assumir",
      cancelText: "Agora não",
      variant: "info",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Lead assumido!", "Fique à vontade para fazer o primeiro contato do seu jeito, sem pressa.");
        fetchLeads();
      } else {
        toast.error("Não foi possível assumir", data.error || "Tente novamente em alguns instantes.");
      }
    } catch (error) {
      console.error("Error accepting lead:", error);
      toast.error("Erro ao assumir lead", "Não foi possível assumir este lead agora. Tente novamente mais tarde.");
    }
  };

  const handleReject = async (leadId: string) => {
    const confirmed = await toast.confirm({
      title: "Liberar este lead?",
      message: "Tem certeza de que prefere não assumir este lead agora? Tudo bem se sim.",
      confirmText: "Sim, liberar",
      cancelText: "Cancelar",
      variant: "warning",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.info("Lead liberado", "Você continua disponível para outras oportunidades.");
        fetchLeads();
      } else {
        toast.error("Não foi possível liberar", data.error || "Tente novamente em alguns instantes.");
      }
    } catch (error) {
      console.error("Error rejecting lead:", error);
      toast.error("Erro ao liberar lead", "Não foi possível liberar este lead agora. Tente novamente.");
    }
  };

  const handleComplete = async (leadId: string) => {
    const confirmed = await toast.confirm({
      title: "Encerrar lead?",
      message:
        "Você já finalizou o atendimento deste lead? Ele será removido da sua lista de leads ativos, mas continuará aparecendo na coluna \"Fechado\" do quadro por 7 dias e seguirá registrado nos relatórios.",
      confirmText: "Sim, encerrar lead",
      cancelText: "Ainda não",
      variant: "info",
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/leads/${leadId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          "Lead encerrado!",
          "Ele saiu da sua lista de leads ativos e ficará na coluna \"Fechado\" do quadro por 7 dias, além de continuar registrado nos relatórios."
        );
        fetchLeads();
      } else {
        toast.error("Não foi possível encerrar o lead", data.error || "Tente novamente em alguns instantes.");
      }
    } catch (error) {
      console.error("Error completing lead:", error);
      toast.error(
        "Erro ao encerrar lead",
        "Não foi possível encerrar este lead agora. Tente novamente em alguns instantes."
      );
    }
  };

  const handleToggleNotes = (leadId: string) => {
    if (openNotesLeadId === leadId) {
      setOpenNotesLeadId(null);
      return;
    }

    setOpenNotesLeadId(leadId);

    if (!notesByLead[leadId]) {
      fetchLeadNotes(leadId);
    }
  };

  const handleAddNote = async (leadId: string) => {
    const content = (noteDrafts[leadId] || "").trim();

    if (!content) {
      toast.warning("Campo vazio", "Escreva uma nota antes de salvar.");
      return;
    }

    try {
      setNotesError((prev) => ({ ...prev, [leadId]: null }));
      setNotesLoading((prev) => ({ ...prev, [leadId]: true }));

      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não conseguimos salvar esta nota agora.");
      }

      setNotesByLead((prev) => ({
        ...prev,
        [leadId]: [...(prev[leadId] || []), data.note],
      }));

      setNoteDrafts((prev) => ({ ...prev, [leadId]: "" }));
    } catch (err: any) {
      console.error("Error creating lead note:", err);
      setNotesError((prev) => ({
        ...prev,
        [leadId]: err?.message || "Não conseguimos salvar esta nota agora.",
      }));
    } finally {
      setNotesLoading((prev) => ({ ...prev, [leadId]: false }));
    }
  };

  function formatPrice(price: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(price / 100);
  }

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / 60000);

    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const getWhatsAppUrl = (phone?: string | null) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "";
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${withCountry}`;
  };

  const getOriginLabel = (lead: Lead) => {
    const v = String((lead as any)?.origin || "").toUpperCase();
    if (v === "WHATSAPP") return "WhatsApp";
    return "Chat";
  };

  const getOriginPillClass = (lead: Lead) => {
    const v = String((lead as any)?.origin || "").toUpperCase();
    if (v === "WHATSAPP") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const getShortLeadId = (id: string) => {
    const s = String(id || "");
    if (!s) return "";
    return s.length <= 8 ? s : s.slice(-8);
  };

  const getLeadDisplayId = (lead: Lead) => {
    const code = lead?.publicCode ? formatPublicCode(String(lead.publicCode)) : "";
    if (code) return code;
    return getShortLeadId(String(lead?.id || ""));
  };

  const getLeadCopyId = (lead: Lead) => {
    const code = lead?.publicCode ? formatPublicCode(String(lead.publicCode)) : "";
    return code || String(lead?.id || "");
  };

  const copyLeadId = async (leadId: string) => {
    try {
      await navigator.clipboard.writeText(String(leadId));
      toast.success("Copiado!", "ID do lead copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar", "Seu navegador bloqueou a cópia. Tente novamente.");
    }
  };

  const isSameDay = (a: Date, b: Date) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const getCanonicalStage = (lead: Lead): CanonicalStage => {
    const canonicalStage = (lead as any).pipelineStage as CanonicalStage | undefined;
    if (canonicalStage) return canonicalStage;
    if (lead.status === "COMPLETED") return "WON";
    if (lead.status === "ACCEPTED") return "CONTACT";
    return "NEW";
  };

  const moveLeadToStage = async (leadId: string, nextStage: CanonicalStage) => {
    const lead = leads.find((l) => String(l.id) === String(leadId));
    if (!lead) return;
    const current = getCanonicalStage(lead);
    if (current === nextStage) return;

    try {
      const confirmTitle = nextStage === "LOST" ? "Marcar como perdido?" : "Mover lead de etapa?";
      const confirmMessage =
        nextStage === "LOST"
          ? "Tem certeza que deseja marcar este lead como perdido?"
          : `Deseja mover este lead para a etapa "${CANONICAL_STAGE_META[nextStage].label}"?`;
      const confirmed = await toast.confirm({
        title: confirmTitle,
        message: confirmMessage,
        confirmText: "Sim, mover",
        cancelText: "Cancelar",
        variant: nextStage === "LOST" ? "warning" : "info",
      });

      if (!confirmed) return;

      setStageUpdating((prev) => ({ ...prev, [leadId]: true }));
      setLeads((prev) => prev.map((l) => (String(l.id) === String(leadId) ? { ...l, pipelineStage: nextStage } : l)));

      const response = await fetch(`/api/leads/${leadId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        setLeads((prev) => prev.map((l) => (String(l.id) === String(leadId) ? lead : l)));
        throw new Error(data?.error || "Não conseguimos atualizar a etapa deste lead agora.");
      }

      toast.success("Etapa atualizada!", `Lead movido para "${CANONICAL_STAGE_META[nextStage].label}".`);
    } catch (err: any) {
      toast.error("Erro ao mover lead", err?.message || "Não conseguimos atualizar a etapa deste lead agora.");
    } finally {
      setStageUpdating((prev) => ({ ...prev, [leadId]: false }));
    }
  };

  // Leads ativos (não encerrados) para contagens e lista
  const activeLeads = useMemo(() => leads.filter((lead) => lead.status !== "COMPLETED"), [leads]);

  const leadsWithTaskToday = activeLeads.filter((lead) => {
    if (!lead.nextActionDate) return false;
    const d = new Date(lead.nextActionDate);
    return isSameDay(d, now) || d < now;
  });

  // Contadores inteligentes
  const smartCounters = useMemo(() => {
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    return {
      // Leads aguardando resposta (com mensagens não lidas)
      awaitingResponse: activeLeads.filter(l => l.hasUnreadMessages).length,
      // Leads com visita/tarefa hoje
      taskToday: leadsWithTaskToday.length,
      // Leads sem contato há 48h
      noContact48h: activeLeads.filter(l => {
        if (!l.lastContactAt) return true; // Nunca contactado
        return new Date(l.lastContactAt) < fortyEightHoursAgo;
      }).length,
    };
  }, [activeLeads, leadsWithTaskToday, now]);

  const leadsBaseForView = useMemo(() => {
    return activeLeads;
  }, [activeLeads]);

  const filteredLeads = leadsBaseForView.filter((lead) => {
    if (propertyIdFromUrl && lead.property?.id !== propertyIdFromUrl) return false;
    if (pipelineFilter !== "all") {
      const stage = getLeadPipelineStage(lead);
      if (stage !== pipelineFilter) return false;
    }

    if (nameFilter) {
      const qRaw = String(nameFilter || "");
      const q = qRaw.toLowerCase();
      const qCode = normalizePublicCodeInput(qRaw);

      const name = String(lead.contact?.name || "").toLowerCase();
      const leadId = String(lead.id || "").toLowerCase();
      const propId = String(lead.property?.id || "").toLowerCase();
      const leadCode = normalizePublicCodeInput(String((lead as any)?.publicCode || ""));
      const propCode = normalizePublicCodeInput(String((lead as any)?.property?.publicCode || ""));

      const matchesText = name.includes(q) || leadId.includes(q) || propId.includes(q);
      const matchesCode = !!qCode && (leadCode.includes(qCode) || propCode.includes(qCode));

      if (!matchesText && !matchesCode) return false;
    }

    // City filter
    if (
      cityFilter &&
      !lead.property.city.toLowerCase().includes(cityFilter.toLowerCase())
    ) {
      return false;
    }

    // Type filter
    if (typeFilter && lead.property.type !== typeFilter) {
      return false;
    }

    // Date filter (createdAt)
    const created = new Date(lead.createdAt);
    if (dateFilter === "today" && !isSameDay(created, now)) {
      return false;
    }
    if (dateFilter === "last7" && created < sevenDaysAgo) {
      return false;
    }

    return true;
  });

  const counts = useMemo(() => {
    const base = leadsBaseForView;

    const grouped: Record<PipelineStage, number> = {
      NEW: 0,
      CONTACT: 0,
      NEGOTIATION: 0,
      CLOSED: 0,
    };

    base.forEach((lead) => {
      const stage = getLeadPipelineStage(lead);
      grouped[stage] += 1;
    });

    return {
      all: base.length,
      ...grouped,
    };
  }, [leadsBaseForView]);

  const stagePickerLead = stagePickerLeadId ? leads.find((l) => String(l.id) === String(stagePickerLeadId)) || null : null;
  const stagePickerCurrentStage = stagePickerLead ? getCanonicalStage(stagePickerLead) : null;
  const stagePickerIsUpdating = stagePickerLeadId ? !!stageUpdating[String(stagePickerLeadId)] : false;
  const stagePickerNextStages: CanonicalStage[] = stagePickerCurrentStage
    ? CANONICAL_STAGE_ORDER.slice(CANONICAL_STAGE_ORDER.indexOf(stagePickerCurrentStage) + 1)
    : [];

  if (loading) {
    return <CenteredSpinner message="Carregando seus leads..." />;
  }

  const renderStageSelector = (lead: Lead) => {
    const currentStage = getCanonicalStage(lead);
    const stageMeta = CANONICAL_STAGE_META[currentStage];
    const isUpdating = !!stageUpdating[String(lead.id)];

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setStagePickerLeadId(String(lead.id));
        }}
        disabled={isUpdating}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${stageMeta.borderColor} ${stageMeta.bgColor} ${stageMeta.color} transition-colors hover:bg-white disabled:opacity-60`}
      >
        {stageMeta.label}
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    );
  };

  return (
    <div className="bg-gray-50">
      {typeof window !== "undefined" && stagePickerLead && stagePickerCurrentStage
        ? createPortal(
            <div className="fixed inset-0 z-[9999]" onMouseDown={() => setStagePickerLeadId(null)}>
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-4">
                <div
                  className="w-full sm:max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Etapas</div>
                      <div className="text-base font-semibold text-gray-900">Mover etapa</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStagePickerLeadId(null)}
                      className="p-2 rounded-full hover:bg-gray-100"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="px-5 py-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Atual</div>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-800">
                        <span
                          className={`h-2 w-2 rounded-full border ${CANONICAL_STAGE_META[stagePickerCurrentStage].borderColor} ${CANONICAL_STAGE_META[stagePickerCurrentStage].bgColor}`}
                        />
                        {CANONICAL_STAGE_META[stagePickerCurrentStage].label}
                      </span>
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    {stagePickerNextStages.length ? (
                      <div className="grid grid-cols-2 gap-2">
                        {stagePickerNextStages
                          .filter((s) => s !== "LOST")
                          .map((stage) => {
                            const meta = CANONICAL_STAGE_META[stage];
                            return (
                              <button
                                key={stage}
                                type="button"
                                disabled={stagePickerIsUpdating}
                                onClick={() => {
                                  setStagePickerLeadId(null);
                                  void moveLeadToStage(String(stagePickerLead.id), stage);
                                }}
                                className="group flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                              >
                                <span className={`h-2 w-2 rounded-full border ${meta.borderColor} ${meta.bgColor}`} />
                                {meta.label}
                              </button>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="px-1 py-2 text-sm text-gray-600">Etapa final.</div>
                    )}

                    {stagePickerNextStages.includes("LOST") && (
                      <div className="mt-4">
                        <button
                          type="button"
                          disabled={stagePickerIsUpdating}
                          onClick={() => {
                            setStagePickerLeadId(null);
                            void moveLeadToStage(String(stagePickerLead.id), "LOST");
                          }}
                          className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Marcar como perdido
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      {/* Contadores inteligentes - visíveis quando tem algo relevante */}
      {(smartCounters.awaitingResponse > 0 || smartCounters.noContact48h > 0) && (
        <div className="bg-white border-b border-gray-200">
          <div className="w-full px-0 py-2">
            <div className="flex flex-wrap gap-3">
              {smartCounters.awaitingResponse > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs whitespace-nowrap">
                  <Bell className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-rose-700 font-medium">{smartCounters.awaitingResponse} cliente(s) aguardando seu retorno</span>
                </div>
              )}
              {smartCounters.taskToday > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs whitespace-nowrap">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-700 font-medium">{smartCounters.taskToday} tarefa(s) hoje</span>
                </div>
              )}
              {smartCounters.noContact48h > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs whitespace-nowrap">
                  <PhoneOff className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-600 font-medium">{smartCounters.noContact48h} sem contato há 48h</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra de filtros e toggle de visualização */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm lg:shadow-none lg:rounded-t-2xl lg:border lg:border-gray-200 lg:border-b-0">
        <div className="w-full">
          {/* Toggle mobile + Filtros */}
          <div className="px-0 py-3">
            <div className="flex items-center gap-3">
            {/* Filtros - scroll horizontal */}
            <div className="flex-1">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all" as const, label: "Todos", count: counts.all },
                  { key: "NEW" as const, label: "Novos", count: counts.NEW },
                  { key: "CONTACT" as const, label: "Contato", count: counts.CONTACT },
                  { key: "NEGOTIATION" as const, label: "Negociação", count: counts.NEGOTIATION },
                  { key: "CLOSED" as const, label: "Fechado", count: counts.CLOSED },
                ].map((item) =>
                  item.key === "all" ? (
                    <button
                      key={item.key}
                      onClick={() => setPipelineFilter(item.key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                        pipelineFilter === item.key
                          ? "bg-teal-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {item.label}
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                          pipelineFilter === item.key ? "bg-white/20" : "bg-gray-200"
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  ) : (
                    <StageChip
                      key={item.key}
                      label={item.label}
                      count={item.count}
                      active={pipelineFilter === item.key}
                      onClick={() => setPipelineFilter(item.key)}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botão de filtros avançados */}
        <div className="px-0 pb-3 flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showFilters || nameFilter || cityFilter || typeFilter || dateFilter !== "all"
                ? "bg-teal-50 text-teal-700 border border-teal-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {(nameFilter || cityFilter || typeFilter || dateFilter !== "all") && (
              <span className="w-2 h-2 rounded-full bg-teal-500" />
            )}
          </button>

          <Link
            href="/broker/crm"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Columns3 className="w-4 h-4" />
            Ver funil
          </Link>

          {/* Quick stats */}
          <div className="ml-auto text-sm text-gray-500">
            {filteredLeads.length} {filteredLeads.length === 1 ? "lead" : "leads"}
          </div>
        </div>

        {/* Filtros avançados colapsáveis */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-gray-100"
            >
              <div className="px-0 py-3 bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Nome..."
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Cidade..."
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  >
                    <option value="">Tipo</option>
                    <option value="HOUSE">Casa</option>
                    <option value="APARTMENT">Apartamento</option>
                    <option value="CONDO">Condomínio</option>
                    <option value="LAND">Terreno</option>
                    <option value="RURAL">Imóvel rural</option>
                    <option value="COMMERCIAL">Comercial</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  {[
                    { value: "all" as const, label: "Qualquer data" },
                    { value: "today" as const, label: "Hoje" },
                    { value: "last7" as const, label: "7 dias" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setDateFilter(item.value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        dateFilter === item.value
                          ? "bg-teal-600 text-white"
                          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {(nameFilter || cityFilter || typeFilter || dateFilter !== "all") && (
                  <button
                    onClick={() => {
                      setNameFilter("");
                      setCityFilter("");
                      setTypeFilter("");
                      setDateFilter("all");
                    }}
                    className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

      {/* Leads Content */}
      <div className="w-full px-0 pt-2 lg:pt-0 pb-6">
        {error ? (
          <EmptyState
            title="Não foi possível carregar seus leads"
            description={error || ""}
            action={
              <button
                onClick={() => fetchLeads()}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
              >
                Tentar novamente
              </button>
            }
          />
        ) : leads.length === 0 ? (
          <EmptyState
            title="Nenhum lead ativo no momento"
            description="Quando novos leads surgirem, eles aparecem aqui automaticamente."
          />
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            title="Nenhum lead encontrado"
            description="Tente ajustar os filtros para ver mais leads."
          />
        ) : (
          /* ===== MODO LISTA ===== */
          <div>
            {/* Mobile: cards (mantém o layout atual) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3 items-start">
              {[...filteredLeads].map((lead) => {
                const isExpanded = expandedLeadId === lead.id;
                const lastActivityLabel = getTimeAgo((lead.lastMessageAt || lead.createdAt) as string);
                const addressLine = [
                  lead.property.street,
                  lead.property.neighborhood,
                  lead.property.city ? `${lead.property.city}/${lead.property.state}` : null,
                ]
                  .filter(Boolean)
                  .join(", ");
                
                return (
                  <motion.div
                    key={lead.id}
                    layout
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow self-start"
                  >
                  {/* Card compacto - sempre visível */}
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => router.push(`/broker/leads/${lead.id}`)}
                  >
                    <div className="sm:hidden">
                      <div className="flex gap-3">
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image
                            src={lead.property.images[0]?.url || "/placeholder.jpg"}
                            alt={lead.property.title}
                            fill
                            className="object-cover"
                          />
                          {lead.hasUnreadMessages && (
                            <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                            {lead.property.title}
                          </h3>
                          <p className="text-teal-600 font-bold text-base mt-0.5">
                            {formatPrice(lead.property.price)}
                          </p>
                          {lead.contact?.name && (
                            <p className="mt-1 text-xs text-gray-600 truncate">
                              {lead.contact.name}
                            </p>
                          )}
                          {addressLine && (
                            <p className="mt-1 text-xs text-gray-500 flex items-center gap-1 min-w-0">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{addressLine}</span>
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getOriginPillClass(lead)}`}
                            >
                              {getOriginLabel(lead)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyLeadId(getLeadCopyId(lead));
                              }}
                              className="text-[10px] font-semibold text-gray-500 hover:text-gray-800"
                              title={getLeadCopyId(lead)}
                            >
                              ID {getLeadDisplayId(lead)}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedLeadId(isExpanded ? null : lead.id);
                          }}
                          className="flex-shrink-0 self-start p-1.5 rounded-lg hover:bg-gray-100"
                          aria-label={isExpanded ? "Recolher" : "Expandir"}
                        >
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="hidden sm:block">
                      <div className="flex gap-3">
                        {/* Imagem pequena */}
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image
                            src={lead.property.images[0]?.url || "/placeholder.jpg"}
                            alt={lead.property.title}
                            fill
                            className="object-cover"
                          />
                          {/* Badge de status sobreposto */}
                          {lead.hasUnreadMessages && (
                            <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                          )}
                        </div>

                        {/* Info principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                {lead.property.title}
                              </h3>
                              <p className="text-teal-600 font-bold text-base sm:text-lg">
                                {formatPrice(lead.property.price)}
                              </p>
                              {lead.contact?.name && (
                                <p className="mt-0.5 text-xs text-gray-600 flex items-center gap-1 truncate">
                                  <User className="w-3 h-3" />
                                  <span className="truncate">{lead.contact.name}</span>
                                </p>
                              )}
                              {lead.lastMessagePreview && (
                                <p className={`mt-1 text-xs ${lead.hasUnreadMessages ? "font-semibold text-gray-900" : "text-gray-600"} line-clamp-2`}>
                                  {lead.lastMessageFromClient ? "Cliente: " : "Você: "}
                                  {lead.lastMessagePreview}
                                </p>
                              )}
                            </div>
                            {renderStageSelector(lead)}
                          </div>
                          
                          {/* Linha de info rápida */}
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {lead.property.city}
                            </span>
                            <span>•</span>
                            <span>{ptBR.type(lead.property.type)}</span>
                            <span>•</span>
                            <span>{lastActivityLabel}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getOriginPillClass(lead)}`}
                            >
                              {getOriginLabel(lead)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyLeadId(getLeadCopyId(lead));
                              }}
                              className="text-[10px] font-semibold text-gray-500 hover:text-gray-800"
                              title={getLeadCopyId(lead)}
                            >
                              ID {getLeadDisplayId(lead)}
                            </button>
                          </div>

                          {/* Alertas inline */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {lead.nextActionDate && (() => {
                              const actionDate = new Date(lead.nextActionDate);
                              const isOverdue = actionDate < now && !isSameDay(actionDate, now);
                              const isToday = isSameDay(actionDate, now);
                              if (isOverdue || isToday) {
                                return (
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    isOverdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                                  }`}>
                                    <Clock className="w-2.5 h-2.5" />
                                    {isOverdue ? "Atrasada" : "Hoje"}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {lead.hasUnreadMessages && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
                                <MessageCircle className="w-2.5 h-2.5" />
                                Mensagem
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chevron para expandir */}
                        <div className="flex-shrink-0 self-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedLeadId(isExpanded ? null : lead.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100"
                            aria-label={isExpanded ? "Recolher" : "Expandir"}
                          >
                            <ChevronDown
                              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Área expandida */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-100"
                      >
                        <div className="p-4 bg-gray-50/50 space-y-4">
                          {/* Endereço completo */}
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                              {lead.property.street}
                              {lead.property.neighborhood && `, ${lead.property.neighborhood}`}
                              {` - ${lead.property.city}/${lead.property.state}`}
                            </span>
                          </div>

                          {/* Detalhes do imóvel */}
                          <div className="flex flex-wrap gap-3 text-xs">
                            {lead.property.bedrooms && (
                              <span className="px-2 py-1 bg-white rounded border border-gray-200">
                                {lead.property.bedrooms} quartos
                              </span>
                            )}
                            {lead.property.bathrooms && (
                              <span className="px-2 py-1 bg-white rounded border border-gray-200">
                                {lead.property.bathrooms} banheiros
                              </span>
                            )}
                            {lead.property.areaM2 && (
                              <span className="px-2 py-1 bg-white rounded border border-gray-200">
                                {lead.property.areaM2}m²
                              </span>
                            )}
                          </div>

                          {/* Info do contato */}
                          {lead.contact && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-900 text-sm">{lead.contact.name}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {lead.contact.phone && (
                                  <>
                                    <a
                                      href={`tel:${lead.contact.phone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                      Ligar
                                    </a>
                                    {getWhatsAppUrl(lead.contact.phone) && (
                                      <a
                                        href={getWhatsAppUrl(lead.contact.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded-lg text-xs font-medium text-green-700 transition-colors"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        WhatsApp
                                      </a>
                                    )}
                                  </>
                                )}
                                <a
                                  href={`mailto:${lead.contact.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  Email
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Timeline */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Criado {getTimeAgo(lead.createdAt)}
                            </span>
                            {lead.respondedAt && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Respondido {getTimeAgo(lead.respondedAt)}
                              </span>
                            )}
                            {lead.reservedUntil && lead.status === "RESERVED" && (
                              <CountdownTimer targetDate={new Date(lead.reservedUntil)} />
                            )}
                          </div>

                          {/* Ações principais */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            {lead.status === "RESERVED" && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAccept(lead.id); }}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Aceitar
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleReject(lead.id); }}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors text-sm"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Recusar
                                </button>
                              </>
                            )}
                            {lead.status === "ACCEPTED" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleComplete(lead.id)}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Encerrar lead
                                </button>
                                <Link
                                  href={`/broker/chats?lead=${lead.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Chat
                                </Link>
                                {getWhatsAppUrl(lead.contact?.phone) && (
                                  <a
                                    href={getWhatsAppUrl(lead.contact?.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                  </a>
                                )}
                              </>
                            )}
                          </div>

                          {/* Notas rápidas */}
                          <div className="pt-2 border-t border-gray-200">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleToggleNotes(lead.id); }}
                              className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
                            >
                              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openNotesLeadId === lead.id ? "rotate-90" : ""}`} />
                              {openNotesLeadId === lead.id ? "Ocultar notas" : "Notas rápidas"}
                            </button>

                            {openNotesLeadId === lead.id && (
                              <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                                {notesError[lead.id] && (
                                  <p className="text-xs text-red-600">{notesError[lead.id]}</p>
                                )}
                                {notesLoading[lead.id] && !notesByLead[lead.id] ? (
                                  <p className="text-xs text-gray-500">Carregando...</p>
                                ) : (
                                  <>
                                    {notesByLead[lead.id]?.length ? (
                                      <div className="space-y-1 max-h-24 overflow-y-auto">
                                        {notesByLead[lead.id].map((note) => (
                                          <div key={note.id} className="p-2 bg-white rounded border border-gray-100 text-xs">
                                            <p className="text-gray-700">{note.content}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                              {new Date(note.createdAt).toLocaleDateString("pt-BR")}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-500">Nenhuma nota ainda.</p>
                                    )}
                                  </>
                                )}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={noteDrafts[lead.id] || ""}
                                    onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                                    placeholder="Adicionar nota..."
                                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddNote(lead.id)}
                                    disabled={!!notesLoading[lead.id]}
                                    className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* Desktop: tabela */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-b-2xl border border-t-0 border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-left text-xs font-semibold text-gray-600">
                        <th className="pl-2 pr-3 py-3">Lead</th>
                        <th className="px-3 py-3">ID</th>
                        <th className="px-3 py-3">Imóvel</th>
                        <th className="px-3 py-3">Etapa</th>
                        <th className="px-3 py-3">Origem</th>
                        <th className="px-3 py-3">Atividade</th>
                        <th className="px-3 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLeads.map((lead) => {
                        const lastActivityLabel = getTimeAgo((lead.lastMessageAt || lead.createdAt) as string);
                        return (
                          <tr
                            key={lead.id}
                            className={`cursor-pointer hover:bg-gray-50 ${lead.hasUnreadMessages ? "bg-blue-50/30" : ""}`}
                            onClick={() => router.push(`/broker/leads/${lead.id}`)}
                          >
                            <td className="pl-2 pr-3 py-3">
                              <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                  <Image
                                    src={lead.property.images[0]?.url || "/placeholder.jpg"}
                                    alt={lead.property.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900 truncate">
                                    {lead.contact?.name || "Lead"}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">{lead.contact?.email || ""}</div>
                                  {lead.hasUnreadMessages && (
                                    <div className="text-[11px] text-blue-700 font-semibold">Mensagem não lida</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => copyLeadId(getLeadCopyId(lead))}
                                className="text-[11px] text-gray-500 hover:text-gray-800 font-semibold"
                                title={getLeadCopyId(lead)}
                              >
                                {getLeadDisplayId(lead)}
                              </button>
                            </td>
                            <td
                              className="px-3 py-3"
                            >
                              <div className="min-w-0">
                                <div
                                  className="font-semibold text-gray-900 truncate"
                                  onMouseEnter={(e) => {
                                    keepHoverPreviewOpen();
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setHoverPreviewLead(lead);
                                    setHoverPreviewRect(rect);
                                  }}
                                  onMouseLeave={() => {
                                    closeHoverPreviewSoon();
                                  }}
                                >
                                  {lead.property.title}
                                </div>
                                <div className="text-xs text-gray-600 truncate">
                                  {lead.property.city}/{lead.property.state} • {ptBR.type(lead.property.type)}
                                </div>
                                <div className="text-xs text-teal-700 font-bold">{formatPrice(lead.property.price)}</div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {lead.property.bedrooms != null ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium" title="Quartos">
                                      <BedDouble className="w-3.5 h-3.5 text-gray-500" />
                                      <span className="tabular-nums">{lead.property.bedrooms}</span>
                                    </span>
                                  ) : null}
                                  {lead.property.bathrooms != null ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium" title="Banheiros">
                                      <Bath className="w-3.5 h-3.5 text-gray-500" />
                                      <span className="tabular-nums">{lead.property.bathrooms}</span>
                                    </span>
                                  ) : null}
                                  {lead.property.parkingSpots != null ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium" title="Vagas">
                                      <Car className="w-3.5 h-3.5 text-gray-500" />
                                      <span className="tabular-nums">{lead.property.parkingSpots}</span>
                                    </span>
                                  ) : null}
                                  {lead.property.areaM2 != null || lead.property.usableAreaM2 != null || lead.property.builtAreaM2 != null || lead.property.privateAreaM2 != null || lead.property.lotAreaM2 != null ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium" title="Área">
                                      <Ruler className="w-3.5 h-3.5 text-gray-500" />
                                      <span className="tabular-nums">
                                        {lead.property.areaM2 ?? lead.property.usableAreaM2 ?? lead.property.builtAreaM2 ?? lead.property.privateAreaM2 ?? lead.property.lotAreaM2}m²
                                      </span>
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">{renderStageSelector(lead)}</td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border ${getOriginPillClass(lead)}`}
                              >
                                {getOriginLabel(lead)}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="text-gray-700">{lastActivityLabel}</div>
                              {lead.lastMessagePreview && (
                                <div className={`text-xs ${lead.hasUnreadMessages ? "font-semibold text-gray-900" : "text-gray-600"} line-clamp-1`}>
                                  {lead.lastMessageFromClient ? "Cliente: " : "Você: "}
                                  {lead.lastMessagePreview}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/broker/chats?lead=${lead.id}`}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Chat
                                </Link>
                                {getWhatsAppUrl(lead.contact?.phone) && (
                                  <a
                                    href={getWhatsAppUrl(lead.contact?.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {nextCursor && (
              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => fetchLeads({ append: true, cursor: nextCursor })}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                  {loadingMore ? "Carregando..." : "Carregar mais"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {previewNode}
    </div>
  );
}
