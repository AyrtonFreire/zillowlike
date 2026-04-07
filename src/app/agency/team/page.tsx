"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";
import Tabs from "@/components/ui/Tabs";
import { AgencyAssistantFeed } from "@/components/crm/AgencyAssistantFeed";
import { Activity, AlertTriangle, BellRing, Bot, Building2, ClipboardList, KeyRound, MessageSquare, Plus, Settings, Shield, Trash2, UserRound, Users, X } from "lucide-react";

type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
  username?: string | null;
  role: string;
};

type TeamMemberRole = "OWNER" | "AGENT" | "ASSISTANT";

type Team = {
  id: string;
  name: string;
  role: string;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  };
  members: TeamMember[];
};

type AgencyProfile = {
  id: string;
  name: string;
  phone: string | null;
  cnpj: string;
  teamId: string;
  publicSlug: string | null;
  publicProfileEnabled: boolean;
  publicProfilePath: string | null;
  publicHeadline: string | null;
  publicBio: string | null;
  publicCity: string | null;
  publicState: string | null;
  publicServiceAreas: string[];
  publicWhatsApp: string | null;
  publicInstagram: string | null;
  website: string | null;
  specialties: string[];
  yearsInBusiness: number | null;
  primaryAgentUserId: string | null;
  playbookBuy: string | null;
  playbookRent: string | null;
  playbookList: string | null;
  routing: {
    buyRealtorId: string | null;
    rentRealtorId: string | null;
    listRealtorId: string | null;
  };
  aiConfig: {
    channels: Record<string, boolean>;
    automations: Record<string, boolean>;
    thresholds: Record<string, number>;
    coaching: {
      overloadLeadsPerAgent: number;
      maxPendingReplyPerAgent: number;
      minExecutionScore: number;
      alertOnWorkloadImbalance: boolean;
      autoPrioritizeCriticalItems: boolean;
    };
  };
  verifiedPhoneVisible: boolean;
  completion: {
    score: number;
    checklist: Array<{ key: string; label: string; done: boolean }>;
  } | null;
  teamMembers: Array<{
    id: string;
    name: string;
    image: string | null;
    headline: string | null;
    publicSlug: string | null;
    publicWhatsApp: string | null;
    phone: string | null;
    phoneVerified: boolean;
  }>;
  team?: {
    id: string;
    name: string;
  };
  workspace?: {
    viewerUserId: string;
    viewerWorkspaceRole: string | null;
    canManageWorkspace: boolean;
    canTransferOwner: boolean;
  };
};

type AgencyProfileFormState = {
  name: string;
  phone: string;
  publicHeadline: string;
  publicBio: string;
  publicCity: string;
  publicState: string;
  publicServiceAreas: string;
  publicWhatsApp: string;
  publicInstagram: string;
  website: string;
  specialties: string;
  yearsInBusiness: string;
  primaryAgentUserId: string;
  buyRealtorId: string;
  rentRealtorId: string;
  listRealtorId: string;
  playbookBuy: string;
  playbookRent: string;
  playbookList: string;
};

type AgencyAiConfigFormState = {
  channels: {
    dashboard: boolean;
    teamChat: boolean;
    whatsapp: boolean;
    email: boolean;
  };
  automations: {
    leadUnassigned: boolean;
    leadPendingReply: boolean;
    leadNoFirstContact: boolean;
    staleLead: boolean;
    clientUnassigned: boolean;
    clientPendingReply: boolean;
    clientNoFirstContact: boolean;
    clientOverdueNextAction: boolean;
    teamChatUnread: boolean;
    teamChatAwaitingResponse: boolean;
    weeklySummary: boolean;
    manualPriorityBoard: boolean;
  };
  thresholds: {
    leadPendingReplyMinutesChat: string;
    leadPendingReplyMinutesForm: string;
    leadPendingReplyMinutesWhatsApp: string;
    staleLeadDays: string;
    clientPendingReplyMinutes: string;
    clientFirstContactGraceMinutes: string;
    teamChatResponseMinutes: string;
  };
  coaching: {
    overloadLeadsPerAgent: string;
    maxPendingReplyPerAgent: string;
    minExecutionScore: string;
    alertOnWorkloadImbalance: boolean;
    autoPrioritizeCriticalItems: boolean;
  };
};

const EMPTY_PROFILE_FORM: AgencyProfileFormState = {
  name: "",
  phone: "",
  publicHeadline: "",
  publicBio: "",
  publicCity: "",
  publicState: "",
  publicServiceAreas: "",
  publicWhatsApp: "",
  publicInstagram: "",
  website: "",
  specialties: "",
  yearsInBusiness: "",
  primaryAgentUserId: "",
  buyRealtorId: "",
  rentRealtorId: "",
  listRealtorId: "",
  playbookBuy: "",
  playbookRent: "",
  playbookList: "",
};

const EMPTY_AI_CONFIG_FORM: AgencyAiConfigFormState = {
  channels: {
    dashboard: true,
    teamChat: true,
    whatsapp: true,
    email: false,
  },
  automations: {
    leadUnassigned: true,
    leadPendingReply: true,
    leadNoFirstContact: true,
    staleLead: true,
    clientUnassigned: true,
    clientPendingReply: true,
    clientNoFirstContact: true,
    clientOverdueNextAction: true,
    teamChatUnread: true,
    teamChatAwaitingResponse: true,
    weeklySummary: true,
    manualPriorityBoard: true,
  },
  thresholds: {
    leadPendingReplyMinutesChat: "15",
    leadPendingReplyMinutesForm: "30",
    leadPendingReplyMinutesWhatsApp: "60",
    staleLeadDays: "3",
    clientPendingReplyMinutes: "60",
    clientFirstContactGraceMinutes: "30",
    teamChatResponseMinutes: "30",
  },
  coaching: {
    overloadLeadsPerAgent: "25",
    maxPendingReplyPerAgent: "5",
    minExecutionScore: "70",
    alertOnWorkloadImbalance: true,
    autoPrioritizeCriticalItems: true,
  },
};

function buildAgencyProfileFormState(profile: AgencyProfile | null | undefined): AgencyProfileFormState {
  if (!profile) return { ...EMPTY_PROFILE_FORM };
  return {
    name: String(profile.name || ""),
    phone: String(profile.phone || ""),
    publicHeadline: String(profile.publicHeadline || ""),
    publicBio: String(profile.publicBio || ""),
    publicCity: String(profile.publicCity || ""),
    publicState: String(profile.publicState || ""),
    publicServiceAreas: Array.isArray(profile.publicServiceAreas) ? profile.publicServiceAreas.join(", ") : "",
    publicWhatsApp: String(profile.publicWhatsApp || ""),
    publicInstagram: String(profile.publicInstagram || ""),
    website: String(profile.website || ""),
    specialties: Array.isArray(profile.specialties) ? profile.specialties.join(", ") : "",
    yearsInBusiness:
      typeof profile.yearsInBusiness === "number" && Number.isFinite(profile.yearsInBusiness)
        ? String(profile.yearsInBusiness)
        : "",
    primaryAgentUserId: String(profile.primaryAgentUserId || ""),
    buyRealtorId: String(profile.routing?.buyRealtorId || ""),
    rentRealtorId: String(profile.routing?.rentRealtorId || ""),
    listRealtorId: String(profile.routing?.listRealtorId || ""),
    playbookBuy: String(profile.playbookBuy || ""),
    playbookRent: String(profile.playbookRent || ""),
    playbookList: String(profile.playbookList || ""),
  };
}

function buildAgencyAiConfigFormState(config: AgencyProfile["aiConfig"] | null | undefined): AgencyAiConfigFormState {
  return {
    channels: {
      dashboard: config?.channels?.dashboard ?? EMPTY_AI_CONFIG_FORM.channels.dashboard,
      teamChat: config?.channels?.teamChat ?? EMPTY_AI_CONFIG_FORM.channels.teamChat,
      whatsapp: config?.channels?.whatsapp ?? EMPTY_AI_CONFIG_FORM.channels.whatsapp,
      email: config?.channels?.email ?? EMPTY_AI_CONFIG_FORM.channels.email,
    },
    automations: {
      leadUnassigned: config?.automations?.leadUnassigned ?? EMPTY_AI_CONFIG_FORM.automations.leadUnassigned,
      leadPendingReply: config?.automations?.leadPendingReply ?? EMPTY_AI_CONFIG_FORM.automations.leadPendingReply,
      leadNoFirstContact: config?.automations?.leadNoFirstContact ?? EMPTY_AI_CONFIG_FORM.automations.leadNoFirstContact,
      staleLead: config?.automations?.staleLead ?? EMPTY_AI_CONFIG_FORM.automations.staleLead,
      clientUnassigned: config?.automations?.clientUnassigned ?? EMPTY_AI_CONFIG_FORM.automations.clientUnassigned,
      clientPendingReply: config?.automations?.clientPendingReply ?? EMPTY_AI_CONFIG_FORM.automations.clientPendingReply,
      clientNoFirstContact: config?.automations?.clientNoFirstContact ?? EMPTY_AI_CONFIG_FORM.automations.clientNoFirstContact,
      clientOverdueNextAction: config?.automations?.clientOverdueNextAction ?? EMPTY_AI_CONFIG_FORM.automations.clientOverdueNextAction,
      teamChatUnread: config?.automations?.teamChatUnread ?? EMPTY_AI_CONFIG_FORM.automations.teamChatUnread,
      teamChatAwaitingResponse:
        config?.automations?.teamChatAwaitingResponse ?? EMPTY_AI_CONFIG_FORM.automations.teamChatAwaitingResponse,
      weeklySummary: config?.automations?.weeklySummary ?? EMPTY_AI_CONFIG_FORM.automations.weeklySummary,
      manualPriorityBoard: config?.automations?.manualPriorityBoard ?? EMPTY_AI_CONFIG_FORM.automations.manualPriorityBoard,
    },
    thresholds: {
      leadPendingReplyMinutesChat: String(
        config?.thresholds?.leadPendingReplyMinutesChat ?? EMPTY_AI_CONFIG_FORM.thresholds.leadPendingReplyMinutesChat
      ),
      leadPendingReplyMinutesForm: String(
        config?.thresholds?.leadPendingReplyMinutesForm ?? EMPTY_AI_CONFIG_FORM.thresholds.leadPendingReplyMinutesForm
      ),
      leadPendingReplyMinutesWhatsApp: String(
        config?.thresholds?.leadPendingReplyMinutesWhatsApp ?? EMPTY_AI_CONFIG_FORM.thresholds.leadPendingReplyMinutesWhatsApp
      ),
      staleLeadDays: String(config?.thresholds?.staleLeadDays ?? EMPTY_AI_CONFIG_FORM.thresholds.staleLeadDays),
      clientPendingReplyMinutes: String(
        config?.thresholds?.clientPendingReplyMinutes ?? EMPTY_AI_CONFIG_FORM.thresholds.clientPendingReplyMinutes
      ),
      clientFirstContactGraceMinutes: String(
        config?.thresholds?.clientFirstContactGraceMinutes ?? EMPTY_AI_CONFIG_FORM.thresholds.clientFirstContactGraceMinutes
      ),
      teamChatResponseMinutes: String(
        config?.thresholds?.teamChatResponseMinutes ?? EMPTY_AI_CONFIG_FORM.thresholds.teamChatResponseMinutes
      ),
    },
    coaching: {
      overloadLeadsPerAgent: String(
        config?.coaching?.overloadLeadsPerAgent ?? EMPTY_AI_CONFIG_FORM.coaching.overloadLeadsPerAgent
      ),
      maxPendingReplyPerAgent: String(
        config?.coaching?.maxPendingReplyPerAgent ?? EMPTY_AI_CONFIG_FORM.coaching.maxPendingReplyPerAgent
      ),
      minExecutionScore: String(config?.coaching?.minExecutionScore ?? EMPTY_AI_CONFIG_FORM.coaching.minExecutionScore),
      alertOnWorkloadImbalance:
        config?.coaching?.alertOnWorkloadImbalance ?? EMPTY_AI_CONFIG_FORM.coaching.alertOnWorkloadImbalance,
      autoPrioritizeCriticalItems:
        config?.coaching?.autoPrioritizeCriticalItems ?? EMPTY_AI_CONFIG_FORM.coaching.autoPrioritizeCriticalItems,
    },
  };
}

function toOptionalInt(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const AI_CHANNEL_FIELDS: Array<{ key: keyof AgencyAiConfigFormState["channels"]; label: string; hint: string }> = [
  { key: "dashboard", label: "Dashboard", hint: "Mostra a central operacional e indicadores na home da agência." },
  { key: "teamChat", label: "Chat do time", hint: "Permite sinais baseados em chat interno e atendimento entre membros." },
  { key: "whatsapp", label: "WhatsApp", hint: "Habilita drafts e gatilhos ligados ao canal de mensagens externas." },
  { key: "email", label: "E-mail", hint: "Reserva o canal para automações por e-mail quando estiver disponível." },
];

const AI_AUTOMATION_FIELDS: Array<{ key: keyof AgencyAiConfigFormState["automations"]; label: string }> = [
  { key: "leadUnassigned", label: "Leads sem responsável" },
  { key: "leadPendingReply", label: "Leads aguardando resposta" },
  { key: "leadNoFirstContact", label: "Leads sem 1º contato" },
  { key: "staleLead", label: "Leads parados" },
  { key: "clientUnassigned", label: "Clientes sem responsável" },
  { key: "clientPendingReply", label: "Clientes aguardando retorno" },
  { key: "clientNoFirstContact", label: "Clientes sem 1º contato" },
  { key: "clientOverdueNextAction", label: "Clientes com próxima ação vencida" },
  { key: "teamChatUnread", label: "Chat do time não lido" },
  { key: "teamChatAwaitingResponse", label: "Chat aguardando resposta" },
  { key: "weeklySummary", label: "Resumo semanal" },
  { key: "manualPriorityBoard", label: "Fila de prioridade manual" },
];

const AI_THRESHOLD_FIELDS: Array<{ key: keyof AgencyAiConfigFormState["thresholds"]; label: string; suffix: string }> = [
  { key: "leadPendingReplyMinutesChat", label: "Lead pendente via chat", suffix: "min" },
  { key: "leadPendingReplyMinutesForm", label: "Lead pendente via formulário", suffix: "min" },
  { key: "leadPendingReplyMinutesWhatsApp", label: "Lead pendente via WhatsApp", suffix: "min" },
  { key: "staleLeadDays", label: "Lead parado", suffix: "dias" },
  { key: "clientPendingReplyMinutes", label: "Cliente aguardando retorno", suffix: "min" },
  { key: "clientFirstContactGraceMinutes", label: "Janela de 1º contato", suffix: "min" },
  { key: "teamChatResponseMinutes", label: "Resposta no chat interno", suffix: "min" },
];

const AI_COACHING_FIELDS: Array<{
  key: "overloadLeadsPerAgent" | "maxPendingReplyPerAgent" | "minExecutionScore";
  label: string;
  suffix: string;
}> = [
  { key: "overloadLeadsPerAgent", label: "Carteira confortável por corretor", suffix: "leads" },
  { key: "maxPendingReplyPerAgent", label: "Pendências antes de alertar", suffix: "itens" },
  { key: "minExecutionScore", label: "Score mínimo desejado", suffix: "%" },
];

type TeamLeadDistributionMode = "ROUND_ROBIN" | "CAPTURER_FIRST" | "MANUAL";

type AgencyInsights = {
  success: boolean;
  generatedAt: string;
  team: { id: string; name: string } | null;
  summary: string;
  funnel: {
    total: number;
    activeTotal: number;
    newLast24h: number;
    unassigned: number;
    byStage: Record<string, number>;
  };
  clients: {
    total: number;
    activeTotal: number;
    newLast24h: number;
    unassigned: number;
    byStage: Record<string, number>;
    byIntent: Record<string, number>;
  };
  sla: {
    pendingReplyTotal: number;
    pendingReplyLeads: Array<{
      leadId: string;
      contactName: string | null;
      propertyTitle: string | null;
      pipelineStage: string | null;
      realtorId: string | null;
      realtorName: string | null;
      lastClientAt: string;
    }>;
    clientPendingReplyTotal: number;
    pendingReplyClients: Array<{
      clientId: string;
      name: string | null;
      pipelineStage: string | null;
      assignedUserId: string | null;
      assignedUserName: string | null;
      lastInboundAt: string;
      lastInboundChannel: string | null;
    }>;
    clientNoFirstContact: number;
    clientOverdueNextAction: number;
  };
  members: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    username?: string | null;
    role: string;
    activeLeads: number;
    pendingReply: number;
    stalledLeads: number;
    wonLeads?: number;
    lostLeads?: number;
    avgFirstResponseMinutes?: number | null;
    activeClients?: number;
    clientPendingReply?: number;
    clientNoFirstContact?: number;
  }>;
  highlights: Array<{
    title: string;
    detail: string;
    severity: "info" | "warning" | "critical";
    href?: string;
    hrefLabel?: string;
  }>;
};

type PipelineMember = {
  userId: string;
  name: string | null;
  email: string | null;
  username?: string | null;
  role: string;
  queuePosition?: number;
  publicWhatsApp?: string | null;
  phoneNormalized?: string | null;
  phone?: string | null;
};

type PipelineLead = {
  id: string;
  status: string;
  pipelineStage: string;
  createdAt: string;
  contact?: { name?: string | null; phone?: string | null } | null;
  property?: { title?: string | null } | null;
  realtor?: { id: string; name: string | null; email: string | null } | null;
};

function InlineSpinner({ message }: { message: string }) {
  return (
    <div className="py-16 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AgencyTeamPage() {
  const { data: session, status } = useSession();

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [team, setTeam] = useState<Team | null>(null);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<TeamMemberRole>("AGENT");
  const [creatingMember, setCreatingMember] = useState(false);

  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [ownerTransferBusy, setOwnerTransferBusy] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");

  const [profileForm, setProfileForm] = useState<AgencyProfileFormState>({ ...EMPTY_PROFILE_FORM });
  const [aiConfigForm, setAiConfigForm] = useState<AgencyAiConfigFormState>({ ...EMPTY_AI_CONFIG_FORM });
  const [savingProfile, setSavingProfile] = useState(false);

  const [leadDistributionMode, setLeadDistributionMode] = useState<TeamLeadDistributionMode>("ROUND_ROBIN");
  const [savingSettings, setSavingSettings] = useState(false);

  const tabFromHash = (hash: string) => {
    const h = String(hash || "").toLowerCase();
    if (h === "#members") return "members";
    if (h === "#invites") return "invites";
    if (h === "#distribution") return "distribution";
    if (h === "#advanced") return "advanced";
    return "general";
  };

  const hashFromTab = (tab: string) => {
    const t = String(tab || "").toLowerCase();
    if (t === "members") return "#members";
    if (t === "invites") return "#invites";
    if (t === "distribution") return "#distribution";
    if (t === "advanced") return "#advanced";
    return "";
  };

  const [activeTab, setActiveTab] = useState<string>("general");

  const navigateTab = (nextTab: string) => {
    setActiveTab(nextTab);
    if (typeof window === "undefined") return;
    const nextHash = hashFromTab(nextTab);
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    window.history.replaceState(null, "", nextUrl);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apply = () => {
      setActiveTab(tabFromHash(window.location.hash));
    };

    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const [insights, setInsights] = useState<AgencyInsights | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [queueMembers, setQueueMembers] = useState<
    Array<{
      userId: string;
      name: string | null;
      email: string | null;
      role: string;
      queuePosition?: number;
    }>
  >([]);
  const [pipelineMembers, setPipelineMembers] = useState<PipelineMember[]>([]);
  const [pipelineLeads, setPipelineLeads] = useState<PipelineLead[]>([]);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [noticeSuccess, setNoticeSuccess] = useState<string | null>(null);
  const [selectedRealtorId, setSelectedRealtorId] = useState<string>("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [noticeTitle, setNoticeTitle] = useState<string>("Aviso da agência");
  const [noticeMessage, setNoticeMessage] = useState<string>("");
  const [sendingNotice, setSendingNotice] = useState(false);

  const routingOptions = useMemo(() => {
    const fromQueue = queueMembers.map((member) => ({
      userId: String(member.userId),
      name: member.name ? String(member.name) : "Corretor",
      role: String(member.role || "AGENT"),
    }));
    const fromProfile = Array.isArray(agencyProfile?.teamMembers)
      ? agencyProfile.teamMembers.map((member) => ({
          userId: String(member.id),
          name: String(member.name || "Corretor"),
          role: "AGENT",
        }))
      : [];
    const seen = new Set<string>();
    return [...fromQueue, ...fromProfile].filter((member) => {
      if (!member.userId || seen.has(member.userId)) return false;
      seen.add(member.userId);
      return true;
    });
  }, [agencyProfile?.teamMembers, queueMembers]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const teamRes = await fetch("/api/teams");
        const teamJson = await teamRes.json().catch(() => null);
        const teams = Array.isArray(teamJson?.teams) ? teamJson.teams : [];
        const selected = teams[0] || null;
        setTeam(selected);

        const profileRes = await fetch("/api/agency/profile");
        const profileJson = await profileRes.json().catch(() => null);
        if (profileRes.ok && profileJson?.success && profileJson?.agencyProfile) {
          setAgencyProfile(profileJson.agencyProfile);
          setProfileForm(buildAgencyProfileFormState(profileJson.agencyProfile));
          setAiConfigForm(buildAgencyAiConfigFormState(profileJson.agencyProfile.aiConfig));
        }

        if (selected?.id) {
          const settingsRes = await fetch(`/api/teams/${selected.id}/settings`);
          const settingsJson = await settingsRes.json().catch(() => null);
          const mode = String(settingsJson?.settings?.leadDistributionMode || "").toUpperCase();
          if (mode === "CAPTURER_FIRST" || mode === "MANUAL" || mode === "ROUND_ROBIN") {
            setLeadDistributionMode(mode as TeamLeadDistributionMode);
          } else {
            setLeadDistributionMode("ROUND_ROBIN");
          }
        }
      } catch (e: any) {
        setError(e?.message || "Não conseguimos carregar os dados do time agora.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [role, status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const run = async () => {
      try {
        setInsightsError(null);
        const r = await fetch("/api/agency/insights", { cache: "no-store" });
        const j = (await r.json().catch(() => null)) as AgencyInsights | null;
        if (!r.ok || !j?.success) {
          throw new Error((j as any)?.error || "Não conseguimos carregar os insights agora.");
        }
        setInsights(j);
      } catch (e: any) {
        setInsights(null);
        setInsightsError(e?.message || "Não conseguimos carregar os insights agora.");
      }
    };

    run();
  }, [role, status, team?.id]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const id = team?.id;
    if (!id) {
      setQueueMembers([]);
      setPipelineMembers([]);
      setPipelineLeads([]);
      return;
    }

    const run = async () => {
      try {
        const r = await fetch(`/api/teams/${id}/pipeline`, { cache: "no-store" });
        const j = await r.json().catch(() => null);
        const members = Array.isArray(j?.members) ? j.members : [];
        const leads = Array.isArray(j?.leads) ? j.leads : [];

        const normalized = (members as any[])
          .map((m) => ({
            userId: String(m?.userId || ""),
            name: m?.name ?? null,
            email: m?.email ?? null,
            role: String(m?.role || ""),
            queuePosition: typeof m?.queuePosition === "number" ? m.queuePosition : undefined,
          }))
          .filter((m) => !!m.userId)
          .filter((m) => String(m.role).toUpperCase() !== "ASSISTANT")
          .sort((a, b) => {
            const aPos = typeof a.queuePosition === "number" ? a.queuePosition : 0;
            const bPos = typeof b.queuePosition === "number" ? b.queuePosition : 0;
            return aPos - bPos;
          });

        setQueueMembers(normalized);
        setPipelineMembers(Array.isArray(members) ? (members as PipelineMember[]) : []);
        setPipelineLeads(Array.isArray(leads) ? (leads as PipelineLead[]) : []);
      } catch {
        setQueueMembers([]);
        setPipelineMembers([]);
        setPipelineLeads([]);
      }
    };

    run();
  }, [role, status, team?.id]);

  const selectedLeadIdSet = useMemo(() => new Set(selectedLeadIds.map(String)), [selectedLeadIds]);

  const realtorOptions = useMemo(() => {
    return (Array.isArray(pipelineMembers) ? pipelineMembers : [])
      .filter((member) => String(member.role || "").toUpperCase() === "AGENT")
      .slice()
      .sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || "")));
  }, [pipelineMembers]);

  const selectedRealtor = useMemo(() => {
    return realtorOptions.find((member) => String(member.userId) === String(selectedRealtorId)) || null;
  }, [realtorOptions, selectedRealtorId]);

  const leadsForSelectedRealtor = useMemo(() => {
    const realtorId = String(selectedRealtorId || "").trim();
    if (!realtorId) return [];
    return (Array.isArray(pipelineLeads) ? pipelineLeads : []).filter((lead) => String(lead.realtor?.id || "") === realtorId);
  }, [pipelineLeads, selectedRealtorId]);

  const teamAttentionMembers = useMemo(() => {
    return (Array.isArray(insights?.members) ? insights.members : [])
      .slice()
      .sort((a, b) => {
        const aLoad = Number(a.pendingReply || 0) + Number(a.clientPendingReply || 0) + Number(a.clientNoFirstContact || 0);
        const bLoad = Number(b.pendingReply || 0) + Number(b.clientPendingReply || 0) + Number(b.clientNoFirstContact || 0);
        if (bLoad !== aLoad) return bLoad - aLoad;
        return Number(b.activeLeads || 0) - Number(a.activeLeads || 0);
      })
      .slice(0, 4);
  }, [insights?.members]);

  const quickLeadAttention = useMemo(() => {
    return Array.isArray(insights?.sla?.pendingReplyLeads) ? insights.sla.pendingReplyLeads.slice(0, 4) : [];
  }, [insights?.sla?.pendingReplyLeads]);

  const quickClientAttention = useMemo(() => {
    return Array.isArray(insights?.sla?.pendingReplyClients) ? insights.sla.pendingReplyClients.slice(0, 3) : [];
  }, [insights?.sla?.pendingReplyClients]);

  const openNoticeModal = async () => {
    setNoticeOpen(true);
    setNoticeError(null);
    setNoticeSuccess(null);
    setSelectedLeadIds([]);
    setNoticeTitle("Aviso da agência");
    setNoticeMessage("");

    if (!team?.id) {
      setNoticeError("Não foi possível identificar o time.");
      return;
    }

    try {
      setNoticeLoading(true);
      const response = await fetch(`/api/teams/${encodeURIComponent(team.id)}/pipeline`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos carregar os dados do time agora.");
      }

      const nextMembers = Array.isArray(data?.members) ? (data.members as PipelineMember[]) : [];
      const nextLeads = Array.isArray(data?.leads) ? (data.leads as PipelineLead[]) : [];
      setPipelineMembers(nextMembers);
      setPipelineLeads(nextLeads);

      const agents = nextMembers
        .filter((member) => String(member.role || "").toUpperCase() === "AGENT")
        .slice()
        .sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || "")));

      setSelectedRealtorId((prev) => {
        if (prev && agents.some((member) => String(member.userId) === String(prev))) return prev;
        return agents[0]?.userId ? String(agents[0].userId) : "";
      });
    } catch (err: any) {
      setNoticeError(err?.message || "Não conseguimos carregar os dados do time agora.");
    } finally {
      setNoticeLoading(false);
    }
  };

  const closeNoticeModal = () => {
    if (sendingNotice) return;
    setNoticeOpen(false);
  };

  const toggleLead = (leadId: string, selected: boolean) => {
    const id = String(leadId || "").trim();
    if (!id) return;
    setSelectedLeadIds((prev) => {
      const next = new Set(prev.map(String));
      if (selected) {
        if (next.size >= 50) return prev;
        next.add(id);
      } else {
        next.delete(id);
      }
      return Array.from(next);
    });
  };

  async function sendNotice() {
    if (!team?.id) {
      setNoticeError("Não foi possível identificar o time.");
      return;
    }
    const realtorId = String(selectedRealtorId || "").trim();
    if (!realtorId) {
      setNoticeError("Selecione um corretor.");
      return;
    }
    if (!Array.isArray(selectedLeadIds) || selectedLeadIds.length === 0) {
      setNoticeError("Selecione pelo menos 1 lead.");
      return;
    }

    try {
      setSendingNotice(true);
      setNoticeError(null);
      setNoticeSuccess(null);

      const response = await fetch("/api/agency/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: String(team.id),
          realtorId,
          leadIds: selectedLeadIds.map(String),
          title: String(noticeTitle || "Aviso da agência").trim(),
          message: String(noticeMessage || "").trim(),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos enviar o aviso agora.");
      }

      setNoticeSuccess("Aviso enviado.");
      setSelectedLeadIds([]);
    } catch (err: any) {
      setNoticeError(err?.message || "Não conseguimos enviar o aviso agora.");
    } finally {
      setSendingNotice(false);
    }
  }

  async function refreshTeam(teamId: string) {
    const teamRes = await fetch("/api/teams");
    const teamJson = await teamRes.json().catch(() => null);
    const teams = Array.isArray(teamJson?.teams) ? teamJson.teams : [];
    const selected = teams.find((t: any) => String(t?.id) === String(teamId)) || teams[0] || null;
    setTeam(selected);

    if (selected?.id) {
      const candidates = (selected.members || []).filter((m: any) => String(m.role).toUpperCase() !== "ASSISTANT");
      const next = candidates.find((m: any) => String(m.id) !== String(selected.owner?.id))?.id || "";
      setNewOwnerId(next);
    }
  }

  async function handleCreateMember(e: FormEvent) {
    e.preventDefault();
    if (!team?.id) return;

    const username = newMemberUsername.trim();
    const password = newMemberPassword;
    if (!username || !password) return;

    try {
      setCreatingMember(true);
      setError(null);

      const roleValue = newMemberRole === "ASSISTANT" ? "ASSISTANT" : "AGENT";

      const res = await fetch(`/api/teams/${team.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMemberName.trim() ? newMemberName.trim() : undefined,
          username,
          password,
          teamRole: roleValue,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos criar este corretor agora.");
      }

      setNewMemberName("");
      setNewMemberUsername("");
      setNewMemberPassword("");
      setNewMemberRole("AGENT");

      await refreshTeam(team.id);
    } catch (err: any) {
      setError(err?.message || "Não conseguimos criar este corretor agora.");
    } finally {
      setCreatingMember(false);
    }
  }

  async function handleResetMemberPassword(targetUserId: string) {
    if (!team?.id) return;

    const password = window.prompt("Defina uma senha provisória (mínimo 8 caracteres):") || "";
    if (!password) return;
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    try {
      setMemberBusyId(targetUserId);
      setError(null);

      const res = await fetch(`/api/teams/${team.id}/members/${targetUserId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos resetar a senha agora.");
      }
    } catch (err: any) {
      setError(err?.message || "Não conseguimos resetar a senha agora.");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleUpdateMemberRole(targetUserId: string, nextRole: TeamMemberRole) {
    if (!team?.id) return;
    if (nextRole !== "AGENT" && nextRole !== "ASSISTANT") return;

    try {
      setMemberBusyId(targetUserId);
      setError(null);

      const res = await fetch(`/api/teams/${team.id}/members/${targetUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos atualizar este membro agora.");
      }

      await refreshTeam(team.id);
    } catch (err: any) {
      setError(err?.message || "Não conseguimos atualizar este membro agora.");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleRemoveMember(targetUserId: string) {
    if (!team?.id) return;

    const confirmed = window.confirm("Remover este membro do time?");
    if (!confirmed) return;

    try {
      setMemberBusyId(targetUserId);
      setError(null);

      const res = await fetch(`/api/teams/${team.id}/members/${targetUserId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos remover este membro agora.");
      }

      await refreshTeam(team.id);
    } catch (err: any) {
      setError(err?.message || "Não conseguimos remover este membro agora.");
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleTransferOwner() {
    if (!team?.id) return;
    if (!newOwnerId) return;

    const confirmed = window.confirm(
      "Transferir a titularidade do time? O novo dono poderá gerenciar membros e configurações."
    );
    if (!confirmed) return;

    try {
      setOwnerTransferBusy(true);
      setError(null);

      const res = await fetch(`/api/teams/${team.id}/owner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos transferir o dono agora.");
      }

      await refreshTeam(team.id);
    } catch (err: any) {
      setError(err?.message || "Não conseguimos transferir o dono agora.");
    } finally {
      setOwnerTransferBusy(false);
    }
  }

  async function handleSaveProfile() {
    try {
      setSavingProfile(true);
      setError(null);

      const yearsInBusinessRaw = profileForm.yearsInBusiness.trim();
      const yearsInBusiness = yearsInBusinessRaw ? Number(yearsInBusinessRaw) : null;
      if (yearsInBusinessRaw && (!Number.isInteger(yearsInBusiness) || Number(yearsInBusiness) < 0)) {
        throw new Error("Informe os anos de atuação com um número inteiro válido.");
      }

      const res = await fetch("/api/agency/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim() ? profileForm.phone.trim() : null,
          publicHeadline: profileForm.publicHeadline.trim() ? profileForm.publicHeadline.trim() : null,
          publicBio: profileForm.publicBio.trim() ? profileForm.publicBio.trim() : null,
          publicCity: profileForm.publicCity.trim() ? profileForm.publicCity.trim() : null,
          publicState: profileForm.publicState.trim() ? profileForm.publicState.trim().toUpperCase() : null,
          publicServiceAreas: profileForm.publicServiceAreas,
          publicWhatsApp: profileForm.publicWhatsApp.trim() ? profileForm.publicWhatsApp.trim() : null,
          publicInstagram: profileForm.publicInstagram.trim() ? profileForm.publicInstagram.trim() : null,
          website: profileForm.website.trim() ? profileForm.website.trim() : null,
          specialties: profileForm.specialties,
          yearsInBusiness,
          primaryAgentUserId: profileForm.primaryAgentUserId || null,
          playbookBuy: profileForm.playbookBuy.trim() ? profileForm.playbookBuy.trim() : null,
          playbookRent: profileForm.playbookRent.trim() ? profileForm.playbookRent.trim() : null,
          playbookList: profileForm.playbookList.trim() ? profileForm.playbookList.trim() : null,
          routing: {
            buyRealtorId: profileForm.buyRealtorId || null,
            rentRealtorId: profileForm.rentRealtorId || null,
            listRealtorId: profileForm.listRealtorId || null,
          },
          aiConfig: {
            channels: { ...aiConfigForm.channels },
            automations: { ...aiConfigForm.automations },
            thresholds: {
              leadPendingReplyMinutesChat: toOptionalInt(aiConfigForm.thresholds.leadPendingReplyMinutesChat),
              leadPendingReplyMinutesForm: toOptionalInt(aiConfigForm.thresholds.leadPendingReplyMinutesForm),
              leadPendingReplyMinutesWhatsApp: toOptionalInt(aiConfigForm.thresholds.leadPendingReplyMinutesWhatsApp),
              staleLeadDays: toOptionalInt(aiConfigForm.thresholds.staleLeadDays),
              clientPendingReplyMinutes: toOptionalInt(aiConfigForm.thresholds.clientPendingReplyMinutes),
              clientFirstContactGraceMinutes: toOptionalInt(aiConfigForm.thresholds.clientFirstContactGraceMinutes),
              teamChatResponseMinutes: toOptionalInt(aiConfigForm.thresholds.teamChatResponseMinutes),
            },
            coaching: {
              overloadLeadsPerAgent: toOptionalInt(aiConfigForm.coaching.overloadLeadsPerAgent),
              maxPendingReplyPerAgent: toOptionalInt(aiConfigForm.coaching.maxPendingReplyPerAgent),
              minExecutionScore: toOptionalInt(aiConfigForm.coaching.minExecutionScore),
              alertOnWorkloadImbalance: aiConfigForm.coaching.alertOnWorkloadImbalance,
              autoPrioritizeCriticalItems: aiConfigForm.coaching.autoPrioritizeCriticalItems,
            },
          },
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos salvar o perfil agora.");
      }

      const updated: AgencyProfile = data.agencyProfile;
      setAgencyProfile((prev) => (prev ? { ...prev, ...updated } : updated));
      setProfileForm(buildAgencyProfileFormState(updated));
      setAiConfigForm(buildAgencyAiConfigFormState(updated.aiConfig));
      if (team && updated?.teamId === team.id && updated?.name) {
        setTeam({ ...team, name: updated.name });
      }
    } catch (err: any) {
      setError(err?.message || "Não conseguimos salvar o perfil agora.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveSettings() {
    if (!team?.id) return;

    try {
      setSavingSettings(true);
      setError(null);

      const res = await fetch(`/api/teams/${team.id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadDistributionMode }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos salvar as configurações agora.");
      }
    } catch (err: any) {
      setError(err?.message || "Não conseguimos salvar as configurações agora.");
    } finally {
      setSavingSettings(false);
    }
  }

  if (status === "loading" || loading) {
    return <InlineSpinner message="Carregando..." />;
  }

  if (!team && !agencyProfile) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-700">
        Acesso negado.
      </div>
    );
  }

  const canManageTeam = Boolean(role === "ADMIN" || agencyProfile?.workspace?.canManageWorkspace || team?.role === "OWNER");
  const canTransferOwner = Boolean(role === "ADMIN" || agencyProfile?.workspace?.canTransferOwner);
  const workspaceRoleLabel = agencyProfile?.workspace?.viewerWorkspaceRole || team?.role || null;
  const currentTeamId = insights?.team?.id || team?.id || agencyProfile?.teamId || "";
  const teamCrmHref = currentTeamId ? `/agency/teams/${encodeURIComponent(currentTeamId)}/crm` : "/agency/leads";
  const profileCompletionPending = agencyProfile?.completion?.checklist?.filter((item) => !item.done).length || 0;
  const enabledAutomationCount = AI_AUTOMATION_FIELDS.filter((field) => aiConfigForm.automations[field.key]).length;
  const enabledChannelsCount = AI_CHANNEL_FIELDS.filter((field) => aiConfigForm.channels[field.key]).length;

  const distributionLabel = (mode: TeamLeadDistributionMode) => {
    if (mode === "CAPTURER_FIRST") return "Prioridade do captador";
    if (mode === "MANUAL") return "Manual";
    return "Round-robin";
  };

  const distributionHint = (mode: TeamLeadDistributionMode) => {
    if (mode === "MANUAL") return "Leads entram sem responsável. O time atribui nos leads do time.";
    if (mode === "CAPTURER_FIRST") return "Quando existe captador/parceiro, ele recebe prioridade.";
    return "Distribui entre corretores de forma equilibrada.";
  };

  const rolePill = (roleValue: string) => {
    const r = String(roleValue || "").toUpperCase();
    if (r === "OWNER") return "border-teal-200 bg-teal-50 text-teal-700";
    if (r === "ASSISTANT") return "border-slate-200 bg-slate-50 text-slate-700";
    return "border-blue-200 bg-blue-50 text-blue-700";
  };

  const initials = (nameOrEmail: string) => {
    const raw = String(nameOrEmail || "").trim();
    if (!raw) return "?";
    const parts = raw.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || raw[0];
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return `${String(first).toUpperCase()}${String(last).toUpperCase()}`.slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {insightsError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {insightsError}
        </div>
      )}

      <Tabs
        key={activeTab}
        defaultKey={activeTab}
        onChange={(k) => navigateTab(k)}
        items={[
          {
            key: "general",
            label: "Command Center",
            content: (
              <div className="space-y-6">
                <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white p-5 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold text-sky-700">
                        <ClipboardList className="h-3.5 w-3.5" />
                        Command Center
                      </div>
                      <h2 className="mt-3 text-xl font-semibold text-gray-900">Supervisão unificada da agência</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Concentre aqui as decisões operacionais do time, os atalhos de execução e a ligação entre CRM, clientes, chat interno e IA.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={teamCrmHref} className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800">
                        <Users className="mr-2 h-4 w-4" />
                        Abrir leads
                      </Link>
                      <button type="button" onClick={() => void openNoticeModal()} className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        <BellRing className="mr-2 h-4 w-4" />
                        Avisar corretor
                      </button>
                      <Link href="/agency/assistant" className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        <Bot className="mr-2 h-4 w-4" />
                        Abrir IA
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Workspace</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{team?.name || agencyProfile?.name || "Agência"}</div>
                      <div className="text-xs text-gray-500">Papel atual: {workspaceRoleLabel || "OWNER"}</div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Distribuição</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{distributionLabel(leadDistributionMode)}</div>
                      <div className="text-xs text-gray-500">{distributionHint(leadDistributionMode)}</div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">IA ativa</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{enabledChannelsCount} canais • {enabledAutomationCount} regras</div>
                      <div className="text-xs text-gray-500">Guardrails ajustáveis em Perfil & IA</div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Perfil público</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{agencyProfile?.completion?.score ?? 0}% completo</div>
                      <div className="text-xs text-gray-500">{profileCompletionPending} item(ns) pendente(s)</div>
                    </div>
                  </div>
                </div>

                {insights?.team ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 sm:gap-6">
                      <MetricCard title="Leads ativos" value={insights.funnel.activeTotal} icon={Activity} subtitle="Em andamento" iconColor="text-teal-700" iconBgColor="bg-teal-50" />
                      <MetricCard title="Sem responsável" value={insights.funnel.unassigned} icon={Users} subtitle="Atribuir no CRM" iconColor="text-amber-700" iconBgColor="bg-amber-50" />
                      <MetricCard title="Pendentes (SLA)" value={insights.sla.pendingReplyTotal} icon={AlertTriangle} subtitle="Cliente aguardando" iconColor="text-rose-700" iconBgColor="bg-rose-50" />
                      <MetricCard title="Clientes ativos" value={insights.clients.activeTotal} icon={UserRound} subtitle="Carteira institucional" iconColor="text-violet-700" iconBgColor="bg-violet-50" />
                      <MetricCard title="Clientes pendentes" value={insights.sla.clientPendingReplyTotal} icon={MessageSquare} subtitle="Inbound sem retorno" iconColor="text-orange-700" iconBgColor="bg-orange-50" />
                      <MetricCard title="Novos 24h" value={insights.funnel.newLast24h} icon={Plus} subtitle="Entradas recentes" iconColor="text-blue-700" iconBgColor="bg-blue-50" />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <div className="xl:col-span-2">
                        <StatCard
                          title="Ações prioritárias"
                          action={<Link href={teamCrmHref} className="text-sm font-medium text-blue-600 hover:text-blue-700">Abrir CRM</Link>}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Link href={`${teamCrmHref}?realtorId=unassigned`} className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4 hover:bg-amber-50 transition-colors">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Distribuição</div>
                              <div className="mt-1 text-2xl font-semibold text-gray-900">{insights.funnel.unassigned}</div>
                              <div className="mt-1 text-sm text-gray-600">lead(s) sem responsável</div>
                            </Link>
                            <Link href={`${teamCrmHref}?onlyPendingReply=1`} className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-4 hover:bg-rose-50 transition-colors">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">SLA de leads</div>
                              <div className="mt-1 text-2xl font-semibold text-gray-900">{insights.sla.pendingReplyTotal}</div>
                              <div className="mt-1 text-sm text-gray-600">cliente(s) aguardando resposta</div>
                            </Link>
                            <Link href="/agency/clients?sla=PENDING_REPLY" className="rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-4 hover:bg-violet-50 transition-colors">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">SLA de clientes</div>
                              <div className="mt-1 text-2xl font-semibold text-gray-900">{insights.sla.clientPendingReplyTotal}</div>
                              <div className="mt-1 text-sm text-gray-600">cliente(s) sem retorno</div>
                            </Link>
                            <Link href="/agency/assistant" className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-4 hover:bg-sky-50 transition-colors">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Fila da IA</div>
                              <div className="mt-1 text-2xl font-semibold text-gray-900">Central dedicada</div>
                              <div className="mt-1 text-sm text-gray-600">revise coaching, alertas e automações</div>
                            </Link>
                          </div>

                          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                              <div className="text-sm font-semibold text-gray-900">Leads pedindo ação</div>
                              <div className="mt-3 space-y-3">
                                {quickLeadAttention.length > 0 ? quickLeadAttention.map((lead) => (
                                  <div key={lead.leadId} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{lead.contactName || lead.propertyTitle || `Lead ${lead.leadId}`}</p>
                                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{lead.realtorName || "Sem corretor definido"} • {formatDateTime(lead.lastClientAt)}</p>
                                      </div>
                                      <Link href={`${teamCrmHref}?lead=${encodeURIComponent(lead.leadId)}`} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Abrir</Link>
                                    </div>
                                  </div>
                                )) : <div className="text-sm text-gray-600">Nenhum lead crítico agora.</div>}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                              <div className="text-sm font-semibold text-gray-900">Clientes pedindo ação</div>
                              <div className="mt-3 space-y-3">
                                {quickClientAttention.length > 0 ? quickClientAttention.map((client) => (
                                  <div key={client.clientId} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{client.name || `Cliente ${client.clientId}`}</p>
                                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{client.assignedUserName || "Sem responsável definido"} • {formatDateTime(client.lastInboundAt)}</p>
                                      </div>
                                      <Link href={`/agency/clients?client=${encodeURIComponent(client.clientId)}`} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Abrir</Link>
                                    </div>
                                  </div>
                                )) : <div className="text-sm text-gray-600">Nenhum cliente crítico agora.</div>}
                              </div>
                            </div>
                          </div>
                        </StatCard>
                      </div>

                      <div className="xl:col-span-1">
                        <StatCard title="Supervisão do time">
                          <div className="space-y-3">
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Resumo</div>
                              <div className="mt-1 text-sm font-semibold text-gray-900">{insights.summary}</div>
                            </div>
                            {teamAttentionMembers.length > 0 ? teamAttentionMembers.map((member) => (
                              <div key={member.userId} className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                                <p className="text-sm font-semibold text-gray-900 truncate">{member.name || member.username || member.email || "Membro"}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-700">{member.activeLeads} leads</span>
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">{member.pendingReply} pendentes</span>
                                  <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-700">{member.activeClients ?? 0} clientes</span>
                                </div>
                                <div className="mt-3">
                                  <Link href={`${teamCrmHref}?realtorId=${encodeURIComponent(member.userId)}`} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Ver carteira</Link>
                                </div>
                              </div>
                            )) : <div className="text-sm text-gray-600">Sem dados por membro ainda.</div>}
                          </div>
                        </StatCard>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <div className="xl:col-span-2">
                        <StatCard
                          title="Fila operacional da IA"
                          action={<Link href="/agency/assistant" className="text-sm font-medium text-blue-600 hover:text-blue-700">Abrir área IA</Link>}
                        >
                          {currentTeamId ? <AgencyAssistantFeed teamId={currentTeamId} embedded /> : <div className="text-sm text-gray-600">Conecte um time para usar a fila operacional.</div>}
                        </StatCard>
                      </div>

                      <div className="xl:col-span-1">
                        <StatCard title="Atalhos de gestão">
                          <div className="space-y-3">
                            <Link href="/agency/team-chat" className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100 transition-colors">
                              <MessageSquare className="mt-0.5 h-4 w-4 text-gray-700" />
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Chat do time</div>
                                <div className="mt-1 text-sm text-gray-600">Acompanhe comunicação interna e destrave respostas.</div>
                              </div>
                            </Link>
                            <a href="#distribution" className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100 transition-colors">
                              <Settings className="mt-0.5 h-4 w-4 text-gray-700" />
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Distribuição e fila</div>
                                <div className="mt-1 text-sm text-gray-600">Revise roteamento, round-robin e ordem do time.</div>
                              </div>
                            </a>
                            <a href="#advanced" className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100 transition-colors">
                              <Building2 className="mt-0.5 h-4 w-4 text-gray-700" />
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Perfil institucional</div>
                                <div className="mt-1 text-sm text-gray-600">Atualize página pública, roteamento e playbooks.</div>
                              </div>
                            </a>
                            <a href="#invites" className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 hover:bg-gray-100 transition-colors">
                              <KeyRound className="mt-0.5 h-4 w-4 text-gray-700" />
                              <div>
                                <div className="text-sm font-semibold text-gray-900">Acessos do time</div>
                                <div className="mt-1 text-sm text-gray-600">Crie logins e mantenha permissões sob controle.</div>
                              </div>
                            </a>
                          </div>
                        </StatCard>
                      </div>
                    </div>
                  </div>
                ) : (
                  <StatCard title="Conecte o time da agência">
                    <div className="text-sm text-gray-600">Vincule um time para liberar o Command Center, o CRM, a fila da IA e as ações de supervisão.</div>
                  </StatCard>
                )}
              </div>
            ),
          },
          {
            key: "members",
            label: "Time",
            content: (
              <div id="members" className="space-y-6">
                <StatCard
                  title="Membros"
                  action={
                    <a href="#invites" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Acessos
                    </a>
                  }
                >
                  {team?.members?.length ? (
                    <div className="space-y-2 text-sm text-gray-700">
                      {team.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3"
                        >
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
                              {initials(m.name || m.username || m.email || "")}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="font-semibold text-gray-900 truncate">{m.name || m.username || m.email || "Membro"}</div>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${rolePill(String(m.role))}`}
                                >
                                  {String(m.role).toUpperCase()}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500 truncate">{m.username || m.email || ""}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            {team?.id && canManageTeam && String(m.role).toUpperCase() !== "OWNER" ? (
                              <select
                                value={String(m.role).toUpperCase()}
                                onChange={(e) => {
                                  const next = String(e.target.value).toUpperCase() as TeamMemberRole;
                                  if (next !== String(m.role).toUpperCase()) {
                                    void handleUpdateMemberRole(m.id, next);
                                  }
                                }}
                                disabled={memberBusyId === m.id}
                                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                              >
                                <option value="AGENT">AGENTE</option>
                                <option value="ASSISTANT">ASSISTENTE</option>
                              </select>
                            ) : (
                              <div className="text-[11px] text-gray-500 uppercase">{m.role}</div>
                            )}

                            {team?.id && canManageTeam && String(m.role).toUpperCase() !== "OWNER" && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.id)}
                                disabled={memberBusyId === m.id}
                                className="inline-flex items-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {canTransferOwner && (
                        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
                          <div className="text-sm font-semibold text-gray-900">Transferir titularidade</div>
                          <div className="mt-1 text-xs text-gray-500">Escolha um membro (não assistente) para virar titular do time.</div>
                          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-end">
                            <div className="flex-1">
                              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Novo dono</label>
                              <select
                                value={newOwnerId}
                                onChange={(e) => setNewOwnerId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                              >
                                <option value="">Selecione um membro</option>
                                {team.members
                                  .filter((m) => String(m.role).toUpperCase() !== "ASSISTANT")
                                  .filter((m) => String(m.id) !== String(team.owner?.id))
                                  .map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name || m.email || m.id}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={handleTransferOwner}
                              disabled={ownerTransferBusy || !newOwnerId}
                              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
                            >
                              {ownerTransferBusy ? "Transferindo..." : "Transferir"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">Nenhum membro encontrado.</div>
                  )}
                </StatCard>
              </div>
            ),
          },
          {
            key: "invites",
            label: "Acessos",
            content: (
              <div id="invites" className="space-y-6">
                <StatCard title="Criar acesso de corretor">
                  <form onSubmit={handleCreateMember} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Nome</label>
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="Nome do corretor"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Usuário</label>
                      <input
                        type="text"
                        value={newMemberUsername}
                        onChange={(e) => setNewMemberUsername(e.target.value)}
                        placeholder="ex: joao.silva"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Senha provisória</label>
                      <input
                        type="password"
                        value={newMemberPassword}
                        onChange={(e) => setNewMemberPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Papel no time</label>
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as TeamMemberRole)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                      >
                        <option value="AGENT">Agente</option>
                        <option value="ASSISTANT">Assistente</option>
                      </select>
                    </div>
                    <div className="md:col-span-4" />
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={creatingMember || !team?.id || !newMemberUsername.trim() || newMemberPassword.length < 8}
                        className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
                      >
                        <KeyRound className="w-4 h-4 mr-2" />
                        {creatingMember ? "Criando..." : "Criar acesso"}
                      </button>
                    </div>
                  </form>
                  <div className="mt-4 text-[11px] text-gray-500">
                    O corretor será obrigado a trocar a senha no primeiro acesso.
                  </div>
                </StatCard>

                <StatCard title="Acessos do time">
                  {team?.members?.length ? (
                    <div className="space-y-2 text-sm text-gray-700">
                      {team.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{m.name || m.username || m.email || "Membro"}</div>
                            <div className="text-[11px] text-gray-500 truncate">{m.username || m.email || ""}</div>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            {team?.id && canManageTeam && (
                              <button
                                type="button"
                                onClick={() => handleResetMemberPassword(m.id)}
                                disabled={memberBusyId === m.id}
                                className="inline-flex items-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                              >
                                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                                Resetar senha
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">Nenhum membro encontrado.</div>
                  )}
                </StatCard>
              </div>
            ),
          },
          {
            key: "distribution",
            label: "Distribuição",
            content: (
              <div id="distribution" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <StatCard
                    title="Distribuição de leads do time"
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Modo</label>
                        <select
                          value={leadDistributionMode}
                          onChange={(e) => setLeadDistributionMode(e.target.value as TeamLeadDistributionMode)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                        >
                          <option value="ROUND_ROBIN">Round-robin</option>
                          <option value="CAPTURER_FIRST">Prioridade do captador/parceiro</option>
                          <option value="MANUAL">Manual (sem responsável)</option>
                        </select>
                      </div>

                      <div className="text-[11px] text-gray-500">{distributionHint(leadDistributionMode)}</div>

                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
                      >
                        {savingSettings ? "Salvando..." : "Salvar preferências"}
                      </button>
                    </div>
                  </StatCard>

                  <StatCard title="Fila interna do time">
                    {queueMembers.length > 0 ? (
                      <>
                        <p className="text-sm text-gray-600">
                          {canManageTeam
                            ? "Ordem de prioridade atual entre os corretores do time."
                            : "Ordem interna de prioridade entre os corretores do time."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {queueMembers.map((member, index) => (
                            <span
                              key={member.userId}
                              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-gray-50 border border-gray-200"
                            >
                              <span className="text-[10px] font-semibold text-gray-500">#{index + 1}</span>
                              <span className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-[10px] font-bold text-gray-700">
                                {initials(member.name || member.email || "")}
                              </span>
                              <span className="text-[11px] font-semibold text-gray-800">
                                {member.name || member.email || "Membro"}
                              </span>
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-600">Sem fila configurada para o time.</div>
                    )}
                  </StatCard>
                </div>
              </div>
            ),
          },
          {
            key: "advanced",
            label: "Perfil & IA",
            content: (
              <div id="advanced" className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Perfil institucional e operação pública</div>
                        <div className="mt-1 text-sm text-gray-600">
                          Mantenha a imagem pública da imobiliária, o roteamento dos contatos e os playbooks institucionais alinhados com a operação real.
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Checklist público</div>
                        <div className="mt-1 text-xl font-semibold text-gray-900">{agencyProfile?.completion?.score ?? 0}%</div>
                        <div className="text-xs text-gray-500">{profileCompletionPending} pendência(s) restante(s)</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Corretor principal</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">
                          {routingOptions.find((member) => String(member.userId) === String(profileForm.primaryAgentUserId || ""))?.name || "Não definido"}
                        </div>
                        <div className="text-xs text-gray-500">Base para intenções sem regra específica</div>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Workspace</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">{workspaceRoleLabel || "OWNER"}</div>
                        <div className="text-xs text-gray-500">Gestão liberada: {canManageTeam ? "sim" : "não"}</div>
                      </div>
                    </div>

                    {agencyProfile?.completion?.checklist?.length ? (
                      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {agencyProfile.completion.checklist.slice(0, 6).map((item) => (
                          <div key={item.key} className={`rounded-xl border px-4 py-3 text-sm ${item.done ? "border-emerald-200 bg-emerald-50/70 text-emerald-800" : "border-amber-200 bg-amber-50/70 text-amber-800"}`}>
                            {item.label}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-700">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-emerald-950">Guardrails em vigor</div>
                        <div className="mt-1 text-sm text-emerald-800">
                          {enabledChannelsCount} canal(is) ativo(s), {enabledAutomationCount} regra(s) operacional(is) e coaching configurado para equilíbrio do time.
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-emerald-900">
                      <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
                        Score mínimo esperado: <span className="font-semibold">{aiConfigForm.coaching.minExecutionScore || "-"}%</span>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
                        Pendências por corretor antes de alertar: <span className="font-semibold">{aiConfigForm.coaching.maxPendingReplyPerAgent || "-"}</span>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
                        Priorização automática crítica: <span className="font-semibold">{aiConfigForm.coaching.autoPrioritizeCriticalItems ? "ativada" : "desativada"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <StatCard title="Perfil da agência">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Nome</label>
                        <input
                          value={profileForm.name}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone</label>
                        <input
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Headline pública</label>
                      <input
                        value={profileForm.publicHeadline}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, publicHeadline: e.target.value }))}
                        maxLength={120}
                        placeholder="Ex.: Imobiliária especializada em compra, locação e captação"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Bio institucional</label>
                      <textarea
                        value={profileForm.publicBio}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, publicBio: e.target.value }))}
                        rows={4}
                        maxLength={500}
                        placeholder="Conte em poucas linhas como sua imobiliária atende clientes e regiões."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade</label>
                        <input
                          value={profileForm.publicCity}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, publicCity: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">UF</label>
                        <input
                          value={profileForm.publicState}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, publicState: e.target.value.toUpperCase() }))}
                          maxLength={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Anos de atuação</label>
                        <input
                          type="number"
                          min={0}
                          max={250}
                          value={profileForm.yearsInBusiness}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, yearsInBusiness: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Áreas atendidas</label>
                      <input
                        value={profileForm.publicServiceAreas}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, publicServiceAreas: e.target.value }))}
                        placeholder="Ex.: Centro, Zona Sul, Petrolina"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp público</label>
                        <input
                          value={profileForm.publicWhatsApp}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, publicWhatsApp: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Instagram</label>
                        <input
                          value={profileForm.publicInstagram}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, publicInstagram: e.target.value }))}
                          placeholder="seuinstagram"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Site</label>
                        <input
                          value={profileForm.website}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))}
                          placeholder="https://sua-imobiliaria.com.br"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Especialidades</label>
                        <input
                          value={profileForm.specialties}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, specialties: e.target.value }))}
                          placeholder="Ex.: alto padrão, locação, lançamentos"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Operação pública</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Configure quem recebe cada intenção e quais mensagens base apoiam os CTAs institucionais.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Corretor principal</label>
                          <select
                            value={profileForm.primaryAgentUserId}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, primaryAgentUserId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="">Não definido</option>
                            {routingOptions.map((member) => (
                              <option key={`primary-${member.userId}`} value={member.userId}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Roteamento compra</label>
                          <select
                            value={profileForm.buyRealtorId}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, buyRealtorId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="">Usar corretor principal</option>
                            {routingOptions.map((member) => (
                              <option key={`buy-${member.userId}`} value={member.userId}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Roteamento locação</label>
                          <select
                            value={profileForm.rentRealtorId}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, rentRealtorId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="">Usar corretor principal</option>
                            {routingOptions.map((member) => (
                              <option key={`rent-${member.userId}`} value={member.userId}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Roteamento anunciar</label>
                          <select
                            value={profileForm.listRealtorId}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, listRealtorId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="">Usar corretor principal</option>
                            {routingOptions.map((member) => (
                              <option key={`list-${member.userId}`} value={member.userId}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Playbook compra</label>
                          <textarea
                            value={profileForm.playbookBuy}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, playbookBuy: e.target.value }))}
                            rows={5}
                            maxLength={500}
                            placeholder="Mensagem-base para quem quer comprar."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Playbook locação</label>
                          <textarea
                            value={profileForm.playbookRent}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, playbookRent: e.target.value }))}
                            rows={5}
                            maxLength={500}
                            placeholder="Mensagem-base para quem quer alugar."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Playbook anunciar</label>
                          <textarea
                            value={profileForm.playbookList}
                            onChange={(e) => setProfileForm((prev) => ({ ...prev, playbookList: e.target.value }))}
                            rows={5}
                            maxLength={500}
                            placeholder="Mensagem-base para quem quer anunciar."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                      <span>
                        CNPJ: <span className="font-medium text-gray-700">{agencyProfile?.cnpj || "-"}</span>
                      </span>
                      <span>
                        Perfil público: <span className="font-medium text-gray-700">{agencyProfile?.publicSlug || "pendente"}</span>
                      </span>
                      {agencyProfile?.completion ? (
                        <span>
                          Completo: <span className="font-medium text-gray-700">{agencyProfile.completion.score}%</span>
                        </span>
                      ) : null}
                      {agencyProfile?.publicProfilePath ? (
                        <Link href={agencyProfile.publicProfilePath} className="font-semibold text-blue-600 hover:text-blue-700">
                          Ver página pública
                        </Link>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
                      >
                        {savingProfile ? "Salvando..." : "Salvar perfil"}
                      </button>
                    </div>
                  </div>
                </StatCard>

                <StatCard title="Guardrails e automações da IA">
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                      <div className="text-sm font-semibold text-violet-950">Canais ativos</div>
                      <div className="mt-1 text-xs text-violet-800">
                        Escolha onde a operação assistida fica visível para o time, sem transformar isso em pressão sobre os corretores.
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {AI_CHANNEL_FIELDS.map((field) => (
                          <label key={field.key} className="flex items-start gap-3 rounded-xl border border-violet-100 bg-white px-4 py-3">
                            <input
                              type="checkbox"
                              checked={aiConfigForm.channels[field.key]}
                              onChange={(e) =>
                                setAiConfigForm((prev) => ({
                                  ...prev,
                                  channels: { ...prev.channels, [field.key]: e.target.checked },
                                }))
                              }
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                            />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{field.label}</div>
                              <div className="text-xs text-gray-500">{field.hint}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                      <div className="text-sm font-semibold text-gray-900">Regras operacionais</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Ative apenas os sinais que realmente ajudam a conectar time, leads e clientes com o próximo passo certo.
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {AI_AUTOMATION_FIELDS.map((field) => (
                          <label key={field.key} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={aiConfigForm.automations[field.key]}
                              onChange={(e) =>
                                setAiConfigForm((prev) => ({
                                  ...prev,
                                  automations: { ...prev.automations, [field.key]: e.target.checked },
                                }))
                              }
                              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                            />
                            <span className="font-medium">{field.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <div className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="text-sm font-semibold text-gray-900">Limiares de atenção</div>
                        <div className="mt-1 text-xs text-gray-500">Defina quando a IA deve trazer algo para a fila operacional.</div>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {AI_THRESHOLD_FIELDS.map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">{field.label}</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  value={aiConfigForm.thresholds[field.key]}
                                  onChange={(e) =>
                                    setAiConfigForm((prev) => ({
                                      ...prev,
                                      thresholds: { ...prev.thresholds, [field.key]: e.target.value },
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm pr-14 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-gray-400">
                                  {field.suffix}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                        <div className="text-sm font-semibold text-emerald-950">Coaching e equilíbrio do time</div>
                        <div className="mt-1 text-xs text-emerald-800">
                          Use metas de apoio e distribuição saudável, sem criar medo ou competição artificial dentro do time.
                        </div>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {AI_COACHING_FIELDS.map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">{field.label}</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  value={aiConfigForm.coaching[field.key]}
                                  onChange={(e) =>
                                    setAiConfigForm((prev) => ({
                                      ...prev,
                                      coaching: { ...prev.coaching, [field.key]: e.target.value },
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-emerald-100 rounded-xl text-sm pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-emerald-500">
                                  {field.suffix}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3">
                            <input
                              type="checkbox"
                              checked={aiConfigForm.coaching.alertOnWorkloadImbalance}
                              onChange={(e) =>
                                setAiConfigForm((prev) => ({
                                  ...prev,
                                  coaching: { ...prev.coaching, alertOnWorkloadImbalance: e.target.checked },
                                }))
                              }
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">Sinalizar desequilíbrio de carga</div>
                              <div className="text-xs text-gray-500">Avise quando a carteira ficar concentrada demais em poucas pessoas.</div>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3">
                            <input
                              type="checkbox"
                              checked={aiConfigForm.coaching.autoPrioritizeCriticalItems}
                              onChange={(e) =>
                                setAiConfigForm((prev) => ({
                                  ...prev,
                                  coaching: { ...prev.coaching, autoPrioritizeCriticalItems: e.target.checked },
                                }))
                              }
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <div className="text-sm font-semibold text-gray-900">Priorizar itens críticos automaticamente</div>
                              <div className="text-xs text-gray-500">Empurra casos sensíveis para a fila da IA sem depender de ação manual.</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </StatCard>
              </div>
            ),
          },
        ]}
      />

      {noticeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
                  <BellRing className="h-3.5 w-3.5" />
                  Aviso operacional
                </div>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">Enviar aviso para um corretor</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Selecione um corretor, marque os leads já atribuídos a ele e gere um aviso que também entra na fila do assistente.
                </p>
              </div>
              <button type="button" onClick={closeNoticeModal} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 hover:bg-gray-50" disabled={sendingNotice}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
              {noticeError ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{noticeError}</div> : null}
              {noticeSuccess ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{noticeSuccess}</div> : null}

              <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Corretor</label>
                    <select
                      value={selectedRealtorId}
                      onChange={(e) => {
                        setSelectedRealtorId(e.target.value);
                        setSelectedLeadIds([]);
                        setNoticeSuccess(null);
                        setNoticeError(null);
                      }}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      disabled={noticeLoading || sendingNotice}
                    >
                      <option value="">Selecione um corretor</option>
                      {realtorOptions.map((member) => (
                        <option key={`notice-realtor-${member.userId}`} value={member.userId}>
                          {member.name || member.email || member.userId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-900">Resumo do destinatário</div>
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      <div>Nome: <span className="font-medium text-gray-900">{selectedRealtor?.name || "-"}</span></div>
                      <div>Contato: <span className="font-medium text-gray-900">{selectedRealtor?.email || selectedRealtor?.phone || "-"}</span></div>
                      <div>Leads atribuídos: <span className="font-medium text-gray-900">{leadsForSelectedRealtor.length}</span></div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Título</label>
                    <input
                      value={noticeTitle}
                      onChange={(e) => setNoticeTitle(e.target.value)}
                      maxLength={140}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      disabled={sendingNotice}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Mensagem</label>
                    <textarea
                      value={noticeMessage}
                      onChange={(e) => setNoticeMessage(e.target.value)}
                      rows={6}
                      maxLength={1200}
                      placeholder="Explique o contexto e o próximo passo esperado do corretor."
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      disabled={sendingNotice}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Leads do corretor</div>
                      <div className="text-xs text-gray-500">Selecione até 50 leads que devem aparecer junto do aviso.</div>
                    </div>
                    <div className="text-xs font-semibold text-gray-500">{selectedLeadIds.length} selecionado(s)</div>
                  </div>

                  <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    {noticeLoading ? (
                      <div className="py-10 text-center text-sm text-gray-500">Carregando leads do time...</div>
                    ) : !selectedRealtorId ? (
                      <div className="py-10 text-center text-sm text-gray-500">Escolha um corretor para ver os leads atribuídos.</div>
                    ) : leadsForSelectedRealtor.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gray-500">Esse corretor ainda não possui leads atribuídos.</div>
                    ) : (
                      leadsForSelectedRealtor.map((lead) => (
                        <label key={`notice-lead-${lead.id}`} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedLeadIdSet.has(String(lead.id))}
                            onChange={(e) => toggleLead(String(lead.id), e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={sendingNotice}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 line-clamp-1">{lead.contact?.name || lead.property?.title || `Lead ${lead.id}`}</div>
                            <div className="mt-1 text-xs text-gray-500 line-clamp-2">{lead.property?.title || "Sem imóvel vinculado"}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-gray-600">
                              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">{lead.pipelineStage || lead.status || "Sem etapa"}</span>
                              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">Criado em {formatDateTime(lead.createdAt)}</span>
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-500">O aviso vira item de alta prioridade para o corretor e aparece na fila da IA.</div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeNoticeModal} className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" disabled={sendingNotice}>
                  Cancelar
                </button>
                <button type="button" onClick={() => void sendNotice()} className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60" disabled={sendingNotice || noticeLoading || !selectedRealtorId || selectedLeadIds.length === 0 || String(noticeTitle || "").trim().length < 3 || String(noticeMessage || "").trim().length < 1}>
                  {sendingNotice ? "Enviando..." : "Enviar aviso"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
