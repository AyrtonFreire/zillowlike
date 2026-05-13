"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Users,
  Phone,
  Eye,
  FileText,
  FileCheck,
  Trophy,
  XCircle,
  ChevronRight,
  Sparkles,
  Search,
  ListChecks,
  BedDouble,
  Bath,
  Ruler,
  Car,
  Columns3,
  Rows3,
  SlidersHorizontal,
} from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import DraggableLeadCard from "@/components/crm/DraggableLeadCard";
import DroppableStageColumn from "@/components/crm/DroppableStageColumn";
import PipelineTransitionModal, { type PipelineTransitionPayload } from "@/components/crm/PipelineTransitionModal";
import CrmClosedTray from "@/components/crm/CrmClosedTray";
import CrmListView from "@/components/crm/CrmListView";
import CrmEmptyState from "@/components/crm/CrmEmptyState";
import CrmFilterDrawer from "@/components/crm/CrmFilterDrawer";
import LeadSidePanel from "@/components/leads/LeadSidePanel";
import { ptBR } from "@/lib/i18n/property";
import { getPusherClient } from "@/lib/pusher-client";
import { PIPELINE_STAGE_META, transitionRequiresReason, type CanonicalPipelineStage } from "@/lib/lead-pipeline";
import { getLeadNextActionState, getLeadStageAgeDays, getLeadTemperature, getStageHealth, isLeadStale } from "@/lib/lead-operational-signals";

interface PipelineLead {
  id: string;
  status: string;
  pipelineStage: "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";
  createdAt: string;
  respondedAt?: string | null;
  completedAt?: string | null;
  stageEnteredAt?: string | null;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
  lastContactAt?: string | null;
  hasUnreadMessages?: boolean;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageFromClient?: boolean;
  visitDate?: string | null;
  visitTime?: string | null;
  lostReason?: string | null;
  conversationState?: string | null;
  outcomeReason?: string | null;
  outcomeDescription?: string | null;
  property: {
    id: string;
    title: string;
    price: number;
    type: string;
    purpose?: "SALE" | "RENT" | null;
    city: string;
    state: string;
    neighborhood?: string | null;
    street?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaM2?: number | null;
    usableAreaM2?: number | null;
    builtAreaM2?: number | null;
    privateAreaM2?: number | null;
    lotAreaM2?: number | null;
    parkingSpots?: number | null;
    images: Array<{ url: string }>;
  };
  contact?: {
    name: string;
    phone?: string | null;
  } | null;
}

const STAGE_ORDER: PipelineLead["pipelineStage"][] = [
  "NEW",
  "CONTACT",
  "VISIT",
  "PROPOSAL",
  "DOCUMENTS",
  "WON",
  "LOST",
];

const STAGE_CONFIG: Record<PipelineLead["pipelineStage"], { 
  label: string; 
  description: string; 
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  NEW: {
    label: PIPELINE_STAGE_META.NEW.label,
    description: PIPELINE_STAGE_META.NEW.description,
    icon: Users,
    color: PIPELINE_STAGE_META.NEW.color,
    bgColor: PIPELINE_STAGE_META.NEW.bgColor,
    borderColor: PIPELINE_STAGE_META.NEW.borderColor,
  },
  CONTACT: {
    label: PIPELINE_STAGE_META.CONTACT.label,
    description: PIPELINE_STAGE_META.CONTACT.description,
    icon: Phone,
    color: PIPELINE_STAGE_META.CONTACT.color,
    bgColor: PIPELINE_STAGE_META.CONTACT.bgColor,
    borderColor: PIPELINE_STAGE_META.CONTACT.borderColor,
  },
  VISIT: {
    label: PIPELINE_STAGE_META.VISIT.label,
    description: PIPELINE_STAGE_META.VISIT.description,
    icon: Eye,
    color: PIPELINE_STAGE_META.VISIT.color,
    bgColor: PIPELINE_STAGE_META.VISIT.bgColor,
    borderColor: PIPELINE_STAGE_META.VISIT.borderColor,
  },
  PROPOSAL: {
    label: PIPELINE_STAGE_META.PROPOSAL.label,
    description: PIPELINE_STAGE_META.PROPOSAL.description,
    icon: FileText,
    color: PIPELINE_STAGE_META.PROPOSAL.color,
    bgColor: PIPELINE_STAGE_META.PROPOSAL.bgColor,
    borderColor: PIPELINE_STAGE_META.PROPOSAL.borderColor,
  },
  DOCUMENTS: {
    label: PIPELINE_STAGE_META.DOCUMENTS.label,
    description: PIPELINE_STAGE_META.DOCUMENTS.description,
    icon: FileCheck,
    color: PIPELINE_STAGE_META.DOCUMENTS.color,
    bgColor: PIPELINE_STAGE_META.DOCUMENTS.bgColor,
    borderColor: PIPELINE_STAGE_META.DOCUMENTS.borderColor,
  },
  WON: {
    label: PIPELINE_STAGE_META.WON.label,
    description: PIPELINE_STAGE_META.WON.description,
    icon: Trophy,
    color: PIPELINE_STAGE_META.WON.color,
    bgColor: PIPELINE_STAGE_META.WON.bgColor,
    borderColor: PIPELINE_STAGE_META.WON.borderColor,
  },
  LOST: {
    label: PIPELINE_STAGE_META.LOST.label,
    description: PIPELINE_STAGE_META.LOST.description,
    icon: XCircle,
    color: PIPELINE_STAGE_META.LOST.color,
    bgColor: PIPELINE_STAGE_META.LOST.bgColor,
    borderColor: PIPELINE_STAGE_META.LOST.borderColor,
  },
};

type FunnelViewPreset = "all" | "unread" | "overdue" | "stale" | "visits" | "proposals" | "documents" | "hot";

const VIEW_PRESETS: Array<{ key: FunnelViewPreset; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "unread", label: "Não lidas" },
  { key: "overdue", label: "Próxima ação" },
  { key: "stale", label: "48h sem contato" },
  { key: "visits", label: "Visitas" },
  { key: "proposals", label: "Propostas" },
  { key: "documents", label: "Docs travados" },
  { key: "hot", label: "Quentes" },
];

const PRIMARY_STAGES: PipelineLead["pipelineStage"][] = ["NEW", "CONTACT", "VISIT", "PROPOSAL", "DOCUMENTS"];

export default function BrokerCrmPage() {
  const { data: session } = useSession();
  const realtorId = (session?.user as any)?.id || "";
  const toast = useToast();

  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [reminderUpdating, setReminderUpdating] = useState<Record<string, boolean>>({});
  const [showCrmHelp, setShowCrmHelp] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [hoverPreviewLead, setHoverPreviewLead] = useState<PipelineLead | null>(null);
  const [hoverPreviewRect, setHoverPreviewRect] = useState<DOMRect | null>(null);
  const hoverPreviewCloseTimer = useRef<number | null>(null);

  const [query, setQuery] = useState("");
  const [viewPreset, setViewPreset] = useState<FunnelViewPreset>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [transitionModal, setTransitionModal] = useState<null | {
    leadId: string;
    currentStage: CanonicalPipelineStage;
    nextStage: CanonicalPipelineStage;
  }>(null);
  const [collapsedByStage, setCollapsedByStage] = useState<Record<PipelineLead["pipelineStage"], boolean>>({
    NEW: false,
    CONTACT: false,
    VISIT: false,
    PROPOSAL: false,
    DOCUMENTS: false,
    WON: false,
    LOST: false,
  });
  const [visibleCountByStage, setVisibleCountByStage] = useState<Record<PipelineLead["pipelineStage"], number>>({
    NEW: 20,
    CONTACT: 20,
    VISIT: 20,
    PROPOSAL: 20,
    DOCUMENTS: 20,
    WON: 20,
    LOST: 20,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 6,
      },
    })
  );

  // Estado para visualização móvel
  const [mobileActiveStage, setMobileActiveStage] = useState<PipelineLead["pipelineStage"]>("NEW");

  const pipelineEtagRef = useRef<string | null>(null);
  const requestStageChangeRef = useRef<((leadId: string, stage: PipelineLead["pipelineStage"]) => void) | null>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const key = "zlw_help_broker_crm_v1";
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        setShowCrmHelp(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const stored = window.localStorage.getItem("zlw_crm_view_mode");
      if (stored === "kanban" || stored === "list") {
        setViewMode(stored);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem("zlw_crm_view_mode", viewMode);
    } catch {
      // ignore storage errors
    }
  }, [viewMode]);

  const fetchLeads = useCallback(async () => {
    try {
      if (!realtorId) return;
      setError(null);
      setLoading(true);

      const headers: Record<string, string> = {};
      if (pipelineEtagRef.current) headers["If-None-Match"] = pipelineEtagRef.current;

      const response = await fetch("/api/leads/my-pipeline", { headers });
      if (response.status === 304) {
        return;
      }
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não conseguimos carregar seus leads agora.");
      }

      const nextEtag = response.headers.get("etag");
      if (nextEtag) pipelineEtagRef.current = nextEtag;

      setLeads(data || []);
    } catch (err: any) {
      console.error("Error fetching pipeline leads:", err);
      setError(err?.message || "Não conseguimos carregar seus leads do funil agora.");
    } finally {
      setLoading(false);
    }
  }, [realtorId]);

  useEffect(() => {
    if (!realtorId) return;
    fetchLeads();
  }, [realtorId, fetchLeads]);

  useEffect(() => {
    if (!realtorId) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `private-realtor-${realtorId}`;
      const channel = pusher.subscribe(channelName);

      const handler = () => {
        if (cancelled) return;
        fetchLeads();
      };

      const autoAdvanceHandler = (payload: any) => {
        if (cancelled || !payload?.leadId || !payload?.suggestedStage) return;
        const stageLabel = STAGE_CONFIG[payload.suggestedStage as PipelineLead["pipelineStage"]]?.label || payload.suggestedStage;
        const contactLabel = payload.contactName ? `${payload.contactName}` : "Este lead";
        toast.showToast({
          type: "info",
          title: `Avançar para ${stageLabel}?`,
          message: `${contactLabel} — ${payload.reason || "Sinal detectado na conversa."}`,
          actionLabel: "Avançar",
          duration: 12000,
          onAction: () => {
            requestStageChangeRef.current?.(String(payload.leadId), payload.suggestedStage);
          },
        });
      };

      channel.bind("assistant:item_updated", handler as any);
      channel.bind("assistant:items_recalculated", handler as any);
      channel.bind("new-chat-message", handler as any);
      channel.bind("lead-chat-read-receipt", handler as any);
      channel.bind("crm:auto-advance-suggested", autoAdvanceHandler as any);

      return () => {
        cancelled = true;
        try {
          channel.unbind("assistant:item_updated", handler as any);
          channel.unbind("assistant:items_recalculated", handler as any);
          channel.unbind("new-chat-message", handler as any);
          channel.unbind("lead-chat-read-receipt", handler as any);
          channel.unbind("crm:auto-advance-suggested", autoAdvanceHandler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      };
    } catch {
      return;
    }
  }, [realtorId, fetchLeads, toast]);

  const handleDismissCrmHelp = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("zlw_help_broker_crm_v1", "dismissed");
      }
    } catch {
      // ignore storage errors
    }
    setShowCrmHelp(false);
  };

  const nowTimestamp = Date.now();

  const openLeadPanel = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsPanelOpen(true);
  };

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const previewNode = useMemo(() => {
    if (!hoverPreviewLead || !hoverPreviewRect) return null;
    if (typeof document === "undefined") return null;

    const maxWidth = 296;
    const margin = 12;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;

    let left = hoverPreviewRect.right + margin;
    let top = hoverPreviewRect.top + 4;

    if (left + maxWidth + margin > vw) {
      left = Math.max(margin, hoverPreviewRect.left - maxWidth - margin);
    }

    top = Math.min(Math.max(margin, top), vh - margin - 168);

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
      hoverPreviewLead.property.lotAreaM2 ??
      null;

    const metrics: Array<{ key: string; icon: any; label: string; value: string | number | null | undefined }> = [
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
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex gap-3 p-3">
            <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
              <Image
                src={hoverPreviewLead.property.images[0]?.url || "/placeholder.jpg"}
                alt={hoverPreviewLead.property.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 line-clamp-2">{hoverPreviewLead.property.title}</div>
              <div className="mt-1 text-sm font-bold text-teal-700">{formatPrice(hoverPreviewLead.property.price)}</div>
              <div className="mt-1 line-clamp-2 text-[11px] text-gray-600">{addressLine}</div>
              <div className="mt-1 text-[11px] text-gray-500">
                {ptBR.type(hoverPreviewLead.property.type)}
                {purposeLabel ? ` • ${purposeLabel}` : ""}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-gray-100 px-3 py-2.5">
            {metrics.slice(0, 3).map((m) => {
              const Icon = m.icon;
              const value = m.value;
              return (
                <span
                  key={m.key}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
                  title={m.label}
                >
                  <Icon className="h-3.5 w-3.5 text-gray-500" />
                  <span className="tabular-nums">{value}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  }, [hoverPreviewLead, hoverPreviewRect, keepHoverPreviewOpen, closeHoverPreviewSoon]);

  const isSameDay = (a: Date, b: Date) => {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };

  const isLeadSla = useCallback((lead: PipelineLead) => {
    if (!lead.nextActionDate) return { overdue: false, today: false };
    const d = new Date(lead.nextActionDate);
    if (Number.isNaN(d.getTime())) return { overdue: false, today: false };
    const today = isSameDay(d, new Date(nowTimestamp));
    const overdue = d.getTime() < nowTimestamp && !today;
    return { overdue, today };
  }, [nowTimestamp]);

  const leadMatchesQuery = (lead: PipelineLead, q: string) => {
    const queryNorm = String(q || "").trim().toLowerCase();
    if (!queryNorm) return true;

    const hay = [
      lead?.property?.title,
      lead?.property?.city,
      lead?.property?.state,
      lead?.property?.neighborhood,
      lead?.contact?.name,
      lead?.lastMessagePreview,
    ]
      .map((s) => String(s || "").toLowerCase())
      .join(" | ");

    return hay.includes(queryNorm);
  };

  const leadPassesViewPreset = useCallback((lead: PipelineLead) => {
    const now = new Date(nowTimestamp);
    if (viewPreset === "all") return true;
    if (viewPreset === "unread") return !!lead.hasUnreadMessages;
    if (viewPreset === "overdue") {
      const state = getLeadNextActionState(lead, now);
      return state.overdue || state.today;
    }
    if (viewPreset === "stale") {
      return isLeadStale(lead, 48, now);
    }
    if (viewPreset === "visits") {
      return lead.pipelineStage === "VISIT" || !!lead.visitDate;
    }
    if (viewPreset === "proposals") {
      return lead.pipelineStage === "PROPOSAL";
    }
    if (viewPreset === "documents") {
      return lead.pipelineStage === "DOCUMENTS" && (getLeadStageAgeDays(lead, now) >= (PIPELINE_STAGE_META.DOCUMENTS.agingWarningDays || 7) || getLeadNextActionState(lead, now).overdue);
    }
    if (viewPreset === "hot") {
      return getLeadTemperature(lead, now) === "hot";
    }
    return true;
  }, [nowTimestamp, viewPreset]);

  const urgencySort = useCallback((a: PipelineLead, b: PipelineLead) => {
    const now = new Date(nowTimestamp);
    const au = a.hasUnreadMessages ? 1 : 0;
    const bu = b.hasUnreadMessages ? 1 : 0;
    if (au !== bu) return bu - au;

    const aTemp = getLeadTemperature(a, now);
    const bTemp = getLeadTemperature(b, now);
    const tempRank = { hot: 2, warm: 1, cool: 0 } as const;
    if (tempRank[aTemp] !== tempRank[bTemp]) return tempRank[bTemp] - tempRank[aTemp];

    const aSla = isLeadSla(a);
    const bSla = isLeadSla(b);
    const aRank = aSla.overdue ? 2 : aSla.today ? 1 : 0;
    const bRank = bSla.overdue ? 2 : bSla.today ? 1 : 0;
    if (aRank !== bRank) return bRank - aRank;

    const aAge = getLeadStageAgeDays(a, now);
    const bAge = getLeadStageAgeDays(b, now);
    if (aAge !== bAge) return bAge - aAge;

    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
      return bTime - aTime;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }, [isLeadSla, nowTimestamp]);

  const searchScopedLeads = useMemo(() => {
    return (leads || []).filter((lead) => leadMatchesQuery(lead, query));
  }, [leads, query]);

  const filteredLeads = useMemo(() => {
    return searchScopedLeads.filter((lead) => leadPassesViewPreset(lead));
  }, [leadPassesViewPreset, searchScopedLeads]);

  const presetFacetCounts = useMemo(() => {
    const now = new Date(nowTimestamp);
    const counts: Record<FunnelViewPreset, number> = {
      all: 0, unread: 0, overdue: 0, stale: 0, visits: 0, proposals: 0, documents: 0, hot: 0,
    };
    for (const lead of searchScopedLeads) {
      counts.all++;
      if (lead.hasUnreadMessages) counts.unread++;
      const state = getLeadNextActionState(lead, now);
      if (state.overdue || state.today) counts.overdue++;
      if (isLeadStale(lead, 48, now)) counts.stale++;
      if (lead.pipelineStage === "VISIT" || !!lead.visitDate) counts.visits++;
      if (lead.pipelineStage === "PROPOSAL") counts.proposals++;
      if (
        lead.pipelineStage === "DOCUMENTS" &&
        (getLeadStageAgeDays(lead, now) >= (PIPELINE_STAGE_META.DOCUMENTS.agingWarningDays || 7) ||
          getLeadNextActionState(lead, now).overdue)
      ) {
        counts.documents++;
      }
      if (getLeadTemperature(lead, now) === "hot") counts.hot++;
    }
    return counts;
  }, [searchScopedLeads, nowTimestamp]);

  const filterGroups = useMemo(() => {
    return [
      {
        title: "Estado",
        options: [
          { key: "all" as FunnelViewPreset, label: "Todos", count: presetFacetCounts.all },
          { key: "unread" as FunnelViewPreset, label: "Não lidas", count: presetFacetCounts.unread },
          { key: "overdue" as FunnelViewPreset, label: "Próxima ação", count: presetFacetCounts.overdue },
          { key: "stale" as FunnelViewPreset, label: "48h sem contato", count: presetFacetCounts.stale },
        ],
      },
      {
        title: "Eventos",
        options: [
          { key: "visits" as FunnelViewPreset, label: "Visitas agendadas", count: presetFacetCounts.visits },
          { key: "proposals" as FunnelViewPreset, label: "Propostas em aberto", count: presetFacetCounts.proposals },
          { key: "documents" as FunnelViewPreset, label: "Docs travados", count: presetFacetCounts.documents },
        ],
      },
      {
        title: "Temperatura",
        options: [
          { key: "hot" as FunnelViewPreset, label: "Quentes", count: presetFacetCounts.hot },
        ],
      },
    ];
  }, [presetFacetCounts]);

  const toggleSelectLead = useCallback((leadId: string) => {
    setSelectedLeadIds((prev) => {
      const id = String(leadId);
      if (!id) return prev;
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLeadIds([]);
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedLeadIds(filteredLeads.map((l) => String(l.id)));
  }, [filteredLeads]);

  const saveReminder = useCallback(
    async (leadId: string, date: string | null, note: string | null) => {
      try {
        setReminderUpdating((prev) => ({ ...prev, [leadId]: true }));

        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  nextActionDate: date,
                  nextActionNote: note,
                }
              : l
          )
        );

        const response = await fetch(`/api/leads/${leadId}/reminder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, note }),
        });

        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Não conseguimos salvar este lembrete agora.");
        }

        toast.success("Lembrete atualizado!", "Próxima ação registrada.");
      } catch (err: any) {
        console.error("Error saving reminder:", err);
        toast.error("Erro ao salvar lembrete", err?.message || "Tente novamente.");
        fetchLeads();
      } finally {
        setReminderUpdating((prev) => ({ ...prev, [leadId]: false }));
      }
    },
    [toast, fetchLeads]
  );

  const moveLeadToStage = useCallback(async (
    leadId: string,
    newStage: PipelineLead["pipelineStage"],
    options?: {
      silent?: boolean;
      announceUndo?: boolean;
      payload?: Partial<PipelineTransitionPayload> & { transitionReason?: string; note?: string; source?: string };
    }
  ) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.pipelineStage === newStage) return false;

    try {
      setUpdating((prev) => ({ ...prev, [leadId]: true }));

      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                pipelineStage: newStage,
                stageEnteredAt: new Date().toISOString(),
              }
            : l
        )
      );

      const response = await fetch(`/api/leads/${leadId}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: newStage,
          ...options?.payload,
          source: options?.payload?.source || "CRM_FUNNEL",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  pipelineStage: lead.pipelineStage,
                  stageEnteredAt: lead.stageEnteredAt,
                  nextActionDate: lead.nextActionDate,
                  nextActionNote: lead.nextActionNote,
                  lostReason: lead.lostReason,
                  outcomeReason: lead.outcomeReason,
                  outcomeDescription: lead.outcomeDescription,
                }
              : l
          )
        );
        throw new Error(data?.error || "Não conseguimos atualizar a etapa deste lead agora.");
      }

      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                ...data.lead,
                pipelineStage: newStage,
                stageEnteredAt: new Date().toISOString(),
                outcomeReason:
                  newStage === "LOST"
                    ? (data?.lead?.lostReason as string | null) || null
                    : newStage === "WON"
                      ? (options?.payload?.wonReason as string | null) || null
                      : null,
                outcomeDescription: options?.payload?.note || null,
              }
            : l
        )
      );

      if (!options?.silent) {
        const canUndo = options?.announceUndo !== false && !transitionRequiresReason(lead.pipelineStage, newStage) && newStage !== "WON" && newStage !== "LOST";
        if (canUndo) {
          toast.showToast({
            type: "info",
            title: `Lead movido para ${STAGE_CONFIG[newStage].label}`,
            message: lead.contact?.name || lead.property.title,
            duration: 7000,
            actionLabel: "Desfazer",
            onAction: async () => {
              await moveLeadToStage(leadId, lead.pipelineStage, {
                silent: true,
                announceUndo: false,
                payload: {
                  transitionReason: "Desfazer movimentação do funil",
                  applyAutomation: false,
                  source: "CRM_FUNNEL_UNDO",
                },
              });
            },
          });
        } else {
          toast.success("Etapa atualizada!", `Lead movido para "${STAGE_CONFIG[newStage].label}".`);
        }
      }
      return true;
    } catch (err: any) {
      console.error("Error updating pipeline stage:", err);
      if (!options?.silent) {
        toast.error("Erro ao mover lead", err?.message || "Não conseguimos atualizar a etapa deste lead agora.");
      }
      return false;
    } finally {
      setUpdating((prev) => ({ ...prev, [leadId]: false }));
    }
  }, [leads, toast]);

  const requestStageChange = useCallback((leadId: string, newStage: PipelineLead["pipelineStage"]) => {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.pipelineStage === newStage) return;
    const sensitive = newStage === "WON" || newStage === "LOST" || transitionRequiresReason(lead.pipelineStage, newStage);
    if (sensitive) {
      setTransitionModal({
        leadId,
        currentStage: lead.pipelineStage as CanonicalPipelineStage,
        nextStage: newStage as CanonicalPipelineStage,
      });
      return;
    }
    void moveLeadToStage(leadId, newStage, { announceUndo: true });
  }, [leads, moveLeadToStage]);

  useEffect(() => {
    requestStageChangeRef.current = requestStageChange;
  }, [requestStageChange]);

  const bulkMoveSelected = useCallback(
    async (newStage: PipelineLead["pipelineStage"]) => {
      const ids = [...selectedLeadIds];
      if (ids.length === 0) return;

      const blocked = ids.some((id) => {
        const lead = leads.find((item) => item.id === id);
        return !lead || transitionRequiresReason(lead.pipelineStage, newStage) || newStage === "WON" || newStage === "LOST";
      });

      if (blocked) {
        toast.info("Use a movimentação individual", "Mudanças com regressão, ganho ou perda pedem contexto por lead.");
        return;
      }

      const confirmed = await toast.confirm({
        title: "Mover leads em lote?",
        message: `Mover ${ids.length} lead(s) para "${STAGE_CONFIG[newStage].label}"?`,
        confirmText: "Sim, mover",
        cancelText: "Cancelar",
        variant: "info",
      });

      if (!confirmed) return;

      for (const id of ids) {
        await moveLeadToStage(String(id), newStage, { silent: true, announceUndo: false, payload: { source: "CRM_FUNNEL_BULK" } });
      }

      toast.success("Leads atualizados!", `${ids.length} lead(s) movidos para "${STAGE_CONFIG[newStage].label}".`);
      clearSelection();
    },
    [selectedLeadIds, toast, moveLeadToStage, clearSelection, leads]
  );

  const handleAdvanceStage = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const currentIndex = STAGE_ORDER.indexOf(lead.pipelineStage);
    if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 2) {
      return;
    }

    const nextStage = STAGE_ORDER[currentIndex + 1];

    requestStageChange(leadId, nextStage);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as PipelineLead["pipelineStage"];

    // Verifica se é uma etapa válida
    if (!STAGE_ORDER.includes(newStage)) return;

    if (selectionMode) return;

    const current = leads.find((l) => String(l.id) === String(leadId));
    if (!current || current.pipelineStage === newStage) return;

    requestStageChange(leadId, newStage);
  };

  const activeLead = activeDragId ? leads.find((l) => l.id === activeDragId) : null;

  const leadsByStage = useMemo(() => {
    const map: Record<PipelineLead["pipelineStage"], PipelineLead[]> = {
      NEW: [],
      CONTACT: [],
      VISIT: [],
      PROPOSAL: [],
      DOCUMENTS: [],
      WON: [],
      LOST: [],
    };

    for (const lead of filteredLeads) {
      const stage = lead.pipelineStage || "NEW";
      map[stage].push(lead);
    }

    for (const stage of STAGE_ORDER) {
      map[stage] = map[stage].sort(urgencySort);
    }

    return map;
  }, [filteredLeads, urgencySort]);

  // Total de leads para cálculo de progresso
  const totalLeads = filteredLeads.length;
  const wonLeads = leadsByStage["WON"].length;
  const progressPercent = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const stageInsights = useMemo(() => {
    const now = new Date(nowTimestamp);
    return STAGE_ORDER.reduce((acc, stage) => {
      const stageLeads = leadsByStage[stage];
      const overdueCount = stageLeads.filter((lead) => getLeadNextActionState(lead, now).overdue).length;
      const agingCount = stageLeads.filter((lead) => {
        const limit = PIPELINE_STAGE_META[stage].agingWarningDays;
        return limit ? getLeadStageAgeDays(lead, now) >= limit : false;
      }).length;
      const hotCount = stageLeads.filter((lead) => getLeadTemperature(lead, now) === "hot").length;
      acc[stage] = {
        overdueCount,
        agingCount,
        hotCount,
        health: getStageHealth({ stage, count: stageLeads.length, overdueCount, agingCount }),
      };
      return acc;
    }, {} as Record<PipelineLead["pipelineStage"], { overdueCount: number; agingCount: number; hotCount: number; health: ReturnType<typeof getStageHealth> }>);
  }, [leadsByStage, nowTimestamp]);
  const dashboardMetrics = useMemo(() => {
    const now = new Date(nowTimestamp);
    const sevenDaysAhead = new Date(now);
    sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
    const activeOpen = filteredLeads.filter((lead) => lead.pipelineStage !== "WON" && lead.pipelineStage !== "LOST");
    const overdue = activeOpen.filter((lead) => getLeadNextActionState(lead, now).overdue).length;
    const hot = activeOpen.filter((lead) => getLeadTemperature(lead, now) === "hot").length;
    const visits = activeOpen.filter((lead) => {
      if (!lead.visitDate) return false;
      const visitAt = new Date(lead.visitDate);
      return !Number.isNaN(visitAt.getTime()) && visitAt.getTime() >= now.getTime() && visitAt.getTime() <= sevenDaysAhead.getTime();
    }).length;
    const docsBlocked = leadsByStage.DOCUMENTS.filter((lead) => getLeadNextActionState(lead, now).overdue || getLeadStageAgeDays(lead, now) >= (PIPELINE_STAGE_META.DOCUMENTS.agingWarningDays || 7)).length;
    const stale = activeOpen.filter((lead) => isLeadStale(lead, 48, now)).length;
    const bottleneck = STAGE_ORDER
      .filter((stage) => stage !== "WON" && stage !== "LOST")
      .sort((a, b) => (stageInsights[b].overdueCount + stageInsights[b].agingCount) - (stageInsights[a].overdueCount + stageInsights[a].agingCount))[0] || null;
    return {
      hot,
      overdue,
      visits,
      docsBlocked,
      stale,
      bottleneck,
    };
  }, [filteredLeads, leadsByStage, nowTimestamp, stageInsights]);

  const renderStageColumn = (stage: PipelineLead["pipelineStage"], compact?: boolean) => {
    const config = STAGE_CONFIG[stage];
    const stageLeads = leadsByStage[stage];
    const Icon = config.icon;
    const insight = stageInsights[stage];
    const isCollapsed = !!collapsedByStage[stage];
    const visibleCount = visibleCountByStage[stage] || 20;
    const visibleLeads = isCollapsed ? [] : stageLeads.slice(0, visibleCount);
    const helperLabel =
      stage === "WON" || stage === "LOST"
        ? stageLeads.length > 0
          ? `${stageLeads.length} registros consolidados`
          : "Nenhum registro recente"
        : insight.overdueCount > 0
          ? `${insight.overdueCount} atenção imediata`
          : insight.hotCount > 0
            ? `${insight.hotCount} oportunidades quentes`
            : "Fluxo sob controle";

    return (
      <DroppableStageColumn
        key={stage}
        stageId={stage}
        label={config.label}
        count={stageLeads.length}
        collapsed={isCollapsed}
        healthTone={insight.health.tone}
        headerRight={
          <span className="hidden xl:inline text-[10px] text-slate-500">{helperLabel}</span>
        }
        onToggleCollapsed={() =>
          setCollapsedByStage((prev) => ({
            ...prev,
            [stage]: !prev[stage],
          }))
        }
        className={compact ? "min-w-0" : "min-w-[292px] xl:min-w-[316px]"}
      >
        {stageLeads.length === 0 ? (
          <CrmEmptyState
            stage={stage}
            icon={Icon}
            iconColorClass={config.color}
            hasActiveFilters={query.trim().length > 0 || viewPreset !== "all"}
            onClearFilters={() => {
              setQuery("");
              setViewPreset("all");
            }}
          />
        ) : (
          <>
            {visibleLeads.map((lead) => (
              <DraggableLeadCard
                key={lead.id}
                lead={lead}
                isUpdating={updating[lead.id]}
                selectionMode={selectionMode}
                selected={selectedLeadIds.includes(String(lead.id))}
                onToggleSelected={() => toggleSelectLead(String(lead.id))}
                onHoverStart={(rect) => {
                  if (hoverPreviewCloseTimer.current) {
                    window.clearTimeout(hoverPreviewCloseTimer.current);
                  }
                  setHoverPreviewLead(lead);
                  setHoverPreviewRect(rect);
                }}
                onHoverEnd={closeHoverPreviewSoon}
                onOpenLead={() => openLeadPanel(String(lead.id))}
                onOpenChat={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = `/broker/chats?lead=${lead.id}`;
                  }
                }}
                onToggleReminder={() => {
                  const hasReminder = !!lead.nextActionDate || !!lead.nextActionNote;
                  if (hasReminder) {
                    saveReminder(String(lead.id), null, null);
                  } else {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(10, 0, 0, 0);
                    saveReminder(String(lead.id), d.toISOString(), null);
                  }
                }}
                isReminderUpdating={reminderUpdating[lead.id]}
                showAdvanceButton={!selectionMode && stage !== "WON" && stage !== "LOST"}
                onAdvance={() => handleAdvanceStage(lead.id)}
              />
            ))}
            {stageLeads.length > visibleCount && !isCollapsed && (
              <button
                type="button"
                onClick={() =>
                  setVisibleCountByStage((prev) => ({
                    ...prev,
                    [stage]: (prev[stage] || 20) + 20,
                  }))
                }
                className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Mostrar mais ({stageLeads.length - visibleCount})
              </button>
            )}
          </>
        )}
      </DroppableStageColumn>
    );
  };

  if (loading) {
    return <CenteredSpinner message="Carregando sua jornada de leads..." />;
  }

  return (
    <div className="bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.10),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_45%,#f3f4f6_100%)] min-h-screen flex flex-col">
      <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col px-4 pb-6 pt-4 md:px-6 lg:px-8">
        <div className="hidden md:block">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_40px_-32px_rgba(15,23,42,0.4)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-[26px] font-semibold tracking-tight text-slate-950">Funil de vendas</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Acompanhe seus leads do primeiro contato ao fechamento.
                </p>
              </div>

              {/* 3 KPIs sticky */}
              <div className="grid grid-cols-3 gap-3 xl:min-w-[460px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Ativos</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tabular-nums text-slate-950">{totalLeads - wonLeads - leadsByStage["LOST"].length}</span>
                    <span className="text-[11px] text-slate-500">de {totalLeads}</span>
                  </div>
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${dashboardMetrics.overdue > 0 ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-slate-50/70"}`}>
                  <div className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${dashboardMetrics.overdue > 0 ? "text-rose-700" : "text-slate-500"}`}>Ações vencidas</div>
                  <div className={`mt-1 text-2xl font-semibold tabular-nums ${dashboardMetrics.overdue > 0 ? "text-rose-900" : "text-slate-950"}`}>{dashboardMetrics.overdue}</div>
                </div>
                <div className="rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-700">Conversão</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums text-teal-900">{progressPercent}%</div>
                  {dashboardMetrics.bottleneck ? (
                    <div className="mt-0.5 truncate text-[10px] text-teal-700/80">Gargalo: {STAGE_CONFIG[dashboardMetrics.bottleneck].label}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por cliente, imóvel, bairro, cidade ou mensagem…"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
                />
              </div>

              <button
                type="button"
                onClick={() => setFilterDrawerOpen(true)}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                  viewPreset !== "all"
                    ? "border-teal-500 bg-teal-50 text-teal-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {viewPreset !== "all" ? (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-teal-600 px-1.5 text-[10px] font-bold text-white">
                    1
                  </span>
                ) : null}
              </button>

              <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("kanban")}
                  title="Visão Kanban"
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${
                    viewMode === "kanban"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Columns3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  title="Visão Lista"
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${
                    viewMode === "list"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Rows3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Lista</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectionMode((v) => !v);
                  setSelectedLeadIds([]);
                }}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                  selectionMode
                    ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ListChecks className="h-4 w-4" />
                Selecionar
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {VIEW_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setViewPreset(preset.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    viewPreset === preset.key
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {selectionMode && (
              <div className="mt-4 rounded-[24px] border border-violet-200 bg-violet-50/80 px-4 py-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-violet-900">{selectedLeadIds.length} lead(s) selecionados</div>
                    <div className="mt-1 text-xs text-violet-700">Escolha uma etapa para mover em lote ou limpe a seleção.</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={selectAllVisible} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50">
                      Selecionar tudo
                    </button>
                    <button type="button" onClick={clearSelection} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50">
                      Limpar
                    </button>
                    {STAGE_ORDER.map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={selectedLeadIds.length === 0}
                        onClick={() => bulkMoveSelected(st)}
                        className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                      >
                        {STAGE_CONFIG[st].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats bar mobile */}
        <div className="md:hidden space-y-3">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.4)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-slate-950">Funil de vendas</h1>
                <p className="mt-0.5 text-[11px] text-slate-600">Acompanhe seus leads do primeiro contato ao fechamento.</p>
              </div>
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 px-3 py-2 text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-700">Conversão</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-teal-900">{progressPercent}%</div>
              </div>
            </div>

            {/* 2 KPIs mobile compactos */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Ativos</div>
                <div className="mt-0.5 text-base font-semibold tabular-nums text-slate-950">{totalLeads - wonLeads - leadsByStage["LOST"].length}</div>
              </div>
              <div className={`rounded-xl border px-3 py-2 ${dashboardMetrics.overdue > 0 ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-slate-50/70"}`}>
                <div className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${dashboardMetrics.overdue > 0 ? "text-rose-700" : "text-slate-500"}`}>Ações vencidas</div>
                <div className={`mt-0.5 text-base font-semibold tabular-nums ${dashboardMetrics.overdue > 0 ? "text-rose-900" : "text-slate-950"}`}>{dashboardMetrics.overdue}</div>
              </div>
            </div>

            <div className="mt-4 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por cliente ou imóvel"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {VIEW_PRESETS.slice(0, 5).map((it) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setViewPreset(it.key)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    viewPreset === it.key
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {it.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectionMode((v) => !v);
                  setSelectedLeadIds([]);
                }}
                className={`ml-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  selectionMode
                    ? "bg-violet-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" />
                Selecionar
              </button>
            </div>

          </div>
        </div>

        {/* Navegação de etapas no mobile */}
        <div className="md:hidden sticky top-0 z-20 mt-3 rounded-[24px] border border-white/70 bg-white/95 shadow-sm backdrop-blur">
          <div className="overflow-x-auto scrollbar-hide px-2 py-2">
            <div className="flex gap-2 min-w-max">
              {STAGE_ORDER.map((stage) => {
                const config = STAGE_CONFIG[stage];
                const count = leadsByStage[stage].length;
                const Icon = config.icon;
                const isActive = mobileActiveStage === stage;

                return (
                  <button
                    key={stage}
                    onClick={() => setMobileActiveStage(stage)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
                      isActive
                        ? "bg-slate-950 text-white shadow-sm"
                        : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/15 text-white" : "bg-white text-slate-500"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {selectionMode && (
            <div className="border-t border-slate-100 px-3 py-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-900">{selectedLeadIds.length} selecionado(s)</span>
                <button type="button" onClick={selectAllVisible} className="font-semibold text-teal-700">
                  Selecionar tudo
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
            {error}
          </div>
        )}

        {/* Help tooltip */}
        <AnimatePresence>
          {showCrmHelp && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mt-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-teal-800 font-medium mb-1">Bem-vindo à Jornada do Cliente!</p>
                  <p className="text-xs text-teal-700">
                    Arraste os leads entre as etapas conforme avançar nas negociações. 
                    No mobile, toque em uma etapa para ver seus leads.
                  </p>
                </div>
                <button
                  onClick={handleDismissCrmHelp}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 whitespace-nowrap"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Desktop: Grid de colunas ou Lista */}
          <div className="hidden md:flex flex-1 min-h-0 w-full pt-6">
            <div className="flex w-full flex-col gap-6">
              {viewMode === "kanban" ? (
                <section className="rounded-[30px] border border-white/70 bg-white/70 p-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
                  <div className="flex items-center justify-between gap-4 px-1 pb-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Pipeline ativo</div>
                      <div className="mt-1 text-xs text-slate-500">Etapas operacionais com foco na próxima melhor ação.</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-500">{PRIMARY_STAGES.reduce((sum, stage) => sum + leadsByStage[stage].length, 0)} leads em aberto</div>
                  </div>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex min-w-max gap-4">
                      {PRIMARY_STAGES.map((stage) => renderStageColumn(stage))}
                    </div>
                  </div>
                </section>
              ) : (
                <section className="rounded-[30px] border border-white/70 bg-white/70 p-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
                  <div className="flex items-center justify-between gap-4 px-1 pb-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Pipeline ativo</div>
                      <div className="mt-1 text-xs text-slate-500">Visualização em lista — ordene clicando nos cabeçalhos.</div>
                    </div>
                    <div className="text-xs font-semibold text-slate-500">{PRIMARY_STAGES.reduce((sum, stage) => sum + leadsByStage[stage].length, 0)} leads em aberto</div>
                  </div>
                  <CrmListView
                    leads={filteredLeads
                      .filter((l) => l.pipelineStage !== "WON" && l.pipelineStage !== "LOST")
                      .map((l) => ({
                        id: l.id,
                        pipelineStage: l.pipelineStage,
                        nextActionDate: l.nextActionDate || null,
                        nextActionNote: l.nextActionNote || null,
                        stageEnteredAt: l.stageEnteredAt || null,
                        visitDate: l.visitDate || null,
                        lastContactAt: l.lastContactAt || null,
                        lastMessageAt: l.lastMessageAt || null,
                        lastMessagePreview: l.lastMessagePreview || null,
                        hasUnreadMessages: l.hasUnreadMessages,
                        contact: l.contact || null,
                        property: {
                          title: l.property.title,
                          price: l.property.price,
                          city: l.property.city,
                          state: l.property.state,
                        },
                      }))}
                    onOpenLead={(id) => openLeadPanel(id)}
                  />
                </section>
              )}

              <CrmClosedTray
                wonLeads={leadsByStage["WON"].map((l) => ({
                  id: l.id,
                  pipelineStage: l.pipelineStage,
                  contact: l.contact,
                  property: l.property,
                  outcomeReason: l.outcomeReason || null,
                  completedAt: l.completedAt || null,
                  updatedAt: (l as any).updatedAt || null,
                }))}
                lostLeads={leadsByStage["LOST"].map((l) => ({
                  id: l.id,
                  pipelineStage: l.pipelineStage,
                  contact: l.contact,
                  property: l.property,
                  outcomeReason: l.outcomeReason || null,
                  completedAt: l.completedAt || null,
                  updatedAt: (l as any).updatedAt || null,
                }))}
                windowDays={30}
              />
            </div>
          </div>

          {/* Mobile: Uma etapa por vez */}
          <div className="md:hidden px-4 py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileActiveStage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {(() => {
                  const config = STAGE_CONFIG[mobileActiveStage];
                  const stageLeads = leadsByStage[mobileActiveStage];
                  const Icon = config.icon;
                  const currentIndex = STAGE_ORDER.indexOf(mobileActiveStage);
                  const nextStage = currentIndex < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIndex + 1] : null;
                  const prevStage = currentIndex > 0 ? STAGE_ORDER[currentIndex - 1] : null;

                  return (
                    <div className="space-y-3">
                      {/* Header da etapa */}
                      <div className={`p-4 rounded-xl ${config.bgColor} ${config.borderColor} border`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
                          </div>
                          <div className="ml-auto">
                            <span className={`text-2xl font-bold ${config.color}`}>{stageLeads.length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Lista de leads */}
                      {stageLeads.length === 0 ? (
                        <CrmEmptyState
                          stage={mobileActiveStage}
                          icon={Icon}
                          iconColorClass={config.color}
                          hasActiveFilters={query.trim().length > 0 || viewPreset !== "all"}
                          onClearFilters={() => {
                            setQuery("");
                            setViewPreset("all");
                          }}
                        />
                      ) : (
                        <div className="space-y-2">
                          {stageLeads.slice(0, visibleCountByStage[mobileActiveStage] || 20).map((lead) => (
                            <DraggableLeadCard
                              key={lead.id}
                              lead={lead}
                              isUpdating={updating[lead.id]}
                              selectionMode={selectionMode}
                              selected={selectedLeadIds.includes(String(lead.id))}
                              onToggleSelected={() => toggleSelectLead(String(lead.id))}
                              onOpenChat={() => {
                                if (typeof window !== "undefined") {
                                  window.location.href = `/broker/chats?lead=${lead.id}`;
                                }
                              }}
                              onToggleReminder={() => {
                                const hasReminder = !!lead.nextActionDate || !!lead.nextActionNote;
                                if (hasReminder) {
                                  saveReminder(String(lead.id), null, null);
                                } else {
                                  const d = new Date();
                                  d.setDate(d.getDate() + 1);
                                  d.setHours(10, 0, 0, 0);
                                  saveReminder(String(lead.id), d.toISOString(), null);
                                }
                              }}
                              isReminderUpdating={reminderUpdating[lead.id]}
                              showAdvanceButton={!selectionMode && mobileActiveStage !== "WON" && mobileActiveStage !== "LOST"}
                              onAdvance={() => handleAdvanceStage(lead.id)}
                              onOpenLead={() => openLeadPanel(String(lead.id))}
                            />
                          ))}
                          {stageLeads.length > (visibleCountByStage[mobileActiveStage] || 20) && (
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleCountByStage((prev) => ({
                                  ...prev,
                                  [mobileActiveStage]: (prev[mobileActiveStage] || 20) + 20,
                                }))
                              }
                              className="w-full px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            >
                              Mostrar mais ({stageLeads.length - (visibleCountByStage[mobileActiveStage] || 20)})
                            </button>
                          )}
                        </div>
                      )}

                      {selectionMode && selectedLeadIds.length > 0 && (
                        <div className="p-3 rounded-xl border border-purple-200 bg-purple-50">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-purple-800 font-semibold">
                              Mover {selectedLeadIds.length} lead(s)
                            </div>
                            <button
                              type="button"
                              onClick={clearSelection}
                              className="text-xs font-semibold text-purple-700 hover:text-purple-900"
                            >
                              Limpar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {STAGE_ORDER.map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => bulkMoveSelected(st)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-purple-200 bg-white text-purple-800 hover:bg-purple-100"
                              >
                                {STAGE_CONFIG[st].label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Navegação entre etapas */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        {prevStage ? (
                          <button
                            onClick={() => setMobileActiveStage(prevStage)}
                            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                          >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                            {STAGE_CONFIG[prevStage].label}
                          </button>
                        ) : <div />}
                        
                        {nextStage && (
                          <button
                            onClick={() => setMobileActiveStage(nextStage)}
                            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                          >
                            {STAGE_CONFIG[nextStage].label}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Drag Overlay */}
          <DragOverlay zIndex={60000}>
            {activeLead ? (
              <div className="pointer-events-none w-[340px]">
                <DraggableLeadCard
                  lead={activeLead}
                  dndDisabledOverride={true}
                  showAdvanceButton={false}
                  className="shadow-2xl border-teal-300"
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {previewNode}

        <PipelineTransitionModal
          isOpen={!!transitionModal}
          currentStage={transitionModal?.currentStage || null}
          nextStage={transitionModal?.nextStage || null}
          isSubmitting={transitionModal ? !!updating[transitionModal.leadId] : false}
          onClose={() => setTransitionModal(null)}
          onSubmit={async (payload) => {
            if (!transitionModal) return;
            const succeeded = await moveLeadToStage(transitionModal.leadId, transitionModal.nextStage, {
              announceUndo: false,
              payload: {
                ...payload,
                source: "CRM_FUNNEL_MODAL",
              },
            });
            if (succeeded) {
              setTransitionModal(null);
            }
          }}
        />

        <LeadSidePanel
          open={isPanelOpen}
          leadId={selectedLeadId}
          onClose={() => setIsPanelOpen(false)}
          onLeadUpdated={fetchLeads}
        />

        <CrmFilterDrawer
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          active={viewPreset}
          onChange={(k) => {
            setViewPreset(k);
            setFilterDrawerOpen(false);
          }}
          groups={filterGroups}
        />
      </div>
    </div>
  );
}
