"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";
import Tabs from "@/components/ui/Tabs";
import { Activity, AlertTriangle, KeyRound, Plus, Settings, Trash2, Users } from "lucide-react";

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
      return;
    }

    const run = async () => {
      try {
        const r = await fetch(`/api/teams/${id}/pipeline`, { cache: "no-store" });
        const j = await r.json().catch(() => null);
        const members = Array.isArray(j?.members) ? j.members : [];

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
      } catch {
        setQueueMembers([]);
      }
    };

    run();
  }, [role, status, team?.id]);

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

  const canManageTeam = role === "ADMIN" || team?.role === "OWNER";

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
            label: "Geral",
            content: (
              <div className="space-y-6">
                <StatCard
                  title="Workspace"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{team?.name || "Time"}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {team?.owner?.name || team?.owner?.email
                          ? `Titular: ${team.owner.name || team.owner.email}`
                          : "Defina um titular para gerenciar o time."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href="#distribution"
                        className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Distribuição
                      </a>
                      <a
                        href="#invites"
                        className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
                      >
                        <KeyRound className="w-4 h-4 mr-2" />
                        Acessos
                      </a>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700">
                      Distribuição: {distributionLabel(leadDistributionMode)}
                    </span>
                    <span className="text-[11px]">{distributionHint(leadDistributionMode)}</span>
                  </div>
                </StatCard>

                {insights?.team && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
                      <MetricCard
                        title="Leads ativos"
                        value={insights.funnel.activeTotal}
                        icon={Activity}
                        subtitle="Em andamento"
                        iconColor="text-teal-700"
                        iconBgColor="bg-teal-50"
                      />
                      <MetricCard
                        title="Sem responsável"
                        value={insights.funnel.unassigned}
                        icon={Users}
                        subtitle="Atribuir nos leads"
                        iconColor="text-amber-700"
                        iconBgColor="bg-amber-50"
                      />
                      <MetricCard
                        title="Pendentes (SLA)"
                        value={insights.sla.pendingReplyTotal}
                        icon={AlertTriangle}
                        subtitle="Cliente aguardando"
                        iconColor="text-rose-700"
                        iconBgColor="bg-rose-50"
                      />
                      <MetricCard
                        title="Clientes ativos"
                        value={insights.clients.activeTotal}
                        icon={Users}
                        subtitle="Carteira institucional"
                        iconColor="text-violet-700"
                        iconBgColor="bg-violet-50"
                      />
                      <MetricCard
                        title="Clientes pendentes"
                        value={insights.sla.clientPendingReplyTotal}
                        icon={AlertTriangle}
                        subtitle="Inbound sem retorno"
                        iconColor="text-orange-700"
                        iconBgColor="bg-orange-50"
                      />
                      <MetricCard
                        title="Novos 24h"
                        value={insights.funnel.newLast24h}
                        icon={Plus}
                        subtitle="Entradas recentes"
                        iconColor="text-blue-700"
                        iconBgColor="bg-blue-50"
                      />
                    </div>

                    <StatCard
                      title="Qualidade do time"
                    >
                      <p className="text-sm text-gray-600">{insights.summary}</p>

                      {Array.isArray(insights.members) && insights.members.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {insights.members.map((m) => (
                            <div
                              key={m.userId}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{m.name || m.username || m.email || "Membro"}</p>
                                <p className="text-xs text-gray-500 truncate">{m.username || m.email || ""}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-semibold text-gray-700">
                                    Ativos: <span className="ml-1 tabular-nums text-gray-900">{m.activeLeads}</span>
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
                                    Clientes: <span className="ml-1 tabular-nums">{m.activeClients ?? 0}</span>
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                                    Pendentes: <span className="ml-1 tabular-nums">{m.pendingReply}</span>
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 font-semibold text-orange-700">
                                    SLA clientes: <span className="ml-1 tabular-nums">{m.clientPendingReply ?? 0}</span>
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">
                                    Parados: <span className="ml-1 tabular-nums">{m.stalledLeads}</span>
                                  </span>
                                </div>
                              </div>

                              <Link
                                href={`/agency/teams/${insights.team?.id}/crm?realtorId=${encodeURIComponent(m.userId)}`}
                                className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Ver leads
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 text-sm text-gray-600">Sem dados por membro ainda.</div>
                      )}

                      {insights.funnel.unassigned > 0 && (
                        <div className="mt-4">
                          <Link
                            href={`/agency/teams/${insights.team.id}/crm?realtorId=unassigned`}
                            className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
                          >
                            Ver leads sem responsável
                          </Link>
                        </div>
                      )}
                    </StatCard>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "members",
            label: "Membros",
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

                      {canManageTeam && (
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
            label: "Avançado",
            content: (
              <div id="advanced" className="space-y-6">
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
    </div>
  );
}
