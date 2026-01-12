"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import MetricCard from "@/components/dashboard/MetricCard";
import StatCard from "@/components/dashboard/StatCard";
import { Activity, AlertTriangle, Copy, Kanban, Mail, Plus, Settings, Trash2, Users } from "lucide-react";

type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
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

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  acceptUrl?: string | null;
};

type AgencyProfile = {
  id: string;
  name: string;
  phone: string | null;
  cnpj: string;
  teamId: string;
  team?: {
    id: string;
    name: string;
  };
};

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
  };
  members: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    role: string;
    activeLeads: number;
    pendingReply: number;
    stalledLeads: number;
  }>;
  highlights: Array<{
    title: string;
    detail: string;
    severity: "info" | "warning" | "critical";
    href?: string;
    hrefLabel?: string;
  }>;
};

export default function AgencyTeamPage() {
  const { data: session, status } = useSession();

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [team, setTeam] = useState<Team | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfile | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>("AGENT");
  const [inviting, setInviting] = useState(false);

  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [ownerTransferBusy, setOwnerTransferBusy] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");

  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [leadDistributionMode, setLeadDistributionMode] = useState<TeamLeadDistributionMode>("ROUND_ROBIN");
  const [savingSettings, setSavingSettings] = useState(false);

  const [insights, setInsights] = useState<AgencyInsights | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "AGENCY" && role !== "ADMIN") {
      setLoading(false);
      return;
    }

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
          setProfileName(String(profileJson.agencyProfile.name || ""));
          setProfilePhone(String(profileJson.agencyProfile.phone || ""));
        }

        if (selected?.id) {
          const [invRes, settingsRes] = await Promise.all([
            fetch(`/api/teams/${selected.id}/invites`),
            fetch(`/api/teams/${selected.id}/settings`),
          ]);

          const invJson = await invRes.json().catch(() => null);
          if (invRes.ok && invJson?.success && Array.isArray(invJson.invites)) {
            setInvites(invJson.invites);
          } else {
            setInvites([]);
          }

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
    if (role !== "AGENCY" && role !== "ADMIN") return;

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

  async function refreshInvites(teamId: string) {
    const invRes = await fetch(`/api/teams/${teamId}/invites`);
    const invJson = await invRes.json().catch(() => null);
    if (invRes.ok && invJson?.success && Array.isArray(invJson.invites)) {
      setInvites(invJson.invites);
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

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!team?.id) return;

    const email = inviteEmail.trim();
    if (!email) return;

    try {
      setInviting(true);
      setError(null);

      const res = await fetch(`/api/teams/${team.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos enviar este convite agora.");
      }

      setInviteEmail("");
      await refreshInvites(team.id);
    } catch (err: any) {
      setError(err?.message || "Não conseguimos enviar este convite agora.");
    } finally {
      setInviting(false);
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

  async function handleRevokeInvite(inviteId: string) {
    if (!team?.id) return;

    try {
      setError(null);
      const res = await fetch(`/api/teams/${team.id}/invites/${inviteId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos revogar este convite agora.");
      }

      await refreshInvites(team.id);
    } catch (err: any) {
      setError(err?.message || "Não conseguimos revogar este convite agora.");
    }
  }

  async function handleSaveProfile() {
    try {
      setSavingProfile(true);
      setError(null);

      const res = await fetch("/api/agency/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim(),
          phone: profilePhone.trim() ? profilePhone.trim() : null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos salvar o perfil agora.");
      }

      const updated: AgencyProfile = data.agencyProfile;
      setAgencyProfile((prev) => (prev ? { ...prev, ...updated } : updated));
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
    return (
      <DashboardLayout
        title="Time da Agência"
        description="Gerencie seu time, convites e preferências de distribuição."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Agência", href: "/agency/dashboard" }, { label: "Time" }]}
      >
        <CenteredSpinner message="Carregando..." />
      </DashboardLayout>
    );
  }

  if (role !== "AGENCY" && role !== "ADMIN") {
    return (
      <DashboardLayout
        title="Time da Agência"
        description="Você não tem permissão para acessar esta área."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Agência" }]}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm text-gray-700">
            Acesso negado.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const canManageTeam = role === "ADMIN" || team?.role === "OWNER";

  const distributionLabel = (mode: TeamLeadDistributionMode) => {
    if (mode === "CAPTURER_FIRST") return "Prioridade do captador";
    if (mode === "MANUAL") return "Manual";
    return "Round-robin";
  };

  const distributionHint = (mode: TeamLeadDistributionMode) => {
    if (mode === "MANUAL") return "Leads entram sem responsável. O time atribui no CRM.";
    if (mode === "CAPTURER_FIRST") return "Quando existe captador/parceiro, ele recebe prioridade.";
    return "Distribui entre corretores de forma equilibrada.";
  };

  const inviteStatusBadge = (status: string) => {
    const s = String(status || "").toUpperCase();
    if (s === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
    if (s === "ACCEPTED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (s === "REVOKED") return "border-gray-200 bg-gray-50 text-gray-700";
    if (s === "EXPIRED") return "border-rose-200 bg-rose-50 text-rose-700";
    return "border-slate-200 bg-slate-50 text-slate-700";
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
    <DashboardLayout
      title="Time da Agência"
      description="Gerencie seu time, convites e preferências de distribuição."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Agência", href: "/agency/dashboard" }, { label: "Time" }]}
      actions={
        <div className="flex items-center gap-2">
          <a
            href="#invites"
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20"
          >
            <Mail className="w-4 h-4 mr-2" />
            Convidar
          </a>
          <Link
            href={team?.id ? `/agency/teams/${team.id}/crm` : "/agency/dashboard"}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20"
          >
            <Kanban className="w-4 h-4 mr-2" />
            Abrir CRM
          </Link>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {insightsError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {insightsError}
          </div>
        )}

        <StatCard
          title="Workspace"
          action={
            <Link href="/agency/dashboard" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Voltar ao painel
            </Link>
          }
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
                <Mail className="w-4 h-4 mr-2" />
                Convidar
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
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
                subtitle="Atribuir no CRM"
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
              action={
                <Link
                  href={`/agency/teams/${insights.team.id}/crm`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Abrir CRM
                </Link>
              }
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
                        <p className="font-semibold text-gray-900 truncate">{m.name || m.email || "Membro"}</p>
                        <p className="text-xs text-gray-500 truncate">{m.email || ""}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-semibold text-gray-700">
                            Ativos: <span className="ml-1 tabular-nums text-gray-900">{m.activeLeads}</span>
                          </span>
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                            Pendentes: <span className="ml-1 tabular-nums">{m.pendingReply}</span>
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
                        Ver no CRM
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatCard title="Perfil da agência">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome</label>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone</label>
                <input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="text-[11px] text-gray-500">
                CNPJ: <span className="font-medium text-gray-700">{agencyProfile?.cnpj || "-"}</span>
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

          <div id="distribution">
            <StatCard
              title="Distribuição de leads do time"
              action={
                team?.id ? (
                  <Link
                    href={`/agency/teams/${team.id}/crm`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Abrir CRM
                  </Link>
                ) : null
              }
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
          </div>
        </div>

        <StatCard
          title="Membros"
          action={
            <a href="#invites" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Convidar
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
                      {initials(m.name || m.email || "")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{m.name || m.email || "Membro"}</div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${rolePill(String(m.role))}`}
                        >
                          {String(m.role).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">{m.email || ""}</div>
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

        <div id="invites">
          <StatCard title="Convites">

            <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end mb-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail do corretor</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="corretor@email.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Papel no time</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamMemberRole)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                >
                  <option value="AGENT">Agente</option>
                  <option value="ASSISTANT">Assistente</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <button
                  type="submit"
                  disabled={inviting || !team?.id}
                  className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {inviting ? "Enviando..." : "Convidar"}
                </button>
              </div>
            </form>

            {invites.length ? (
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{inv.email}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 font-semibold ${inviteStatusBadge(String(inv.status))}`}
                          >
                            {String(inv.status).toUpperCase()}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 font-semibold ${rolePill(String(inv.role))}`}
                          >
                            {String(inv.role).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inv.acceptUrl && inv.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(String(inv.acceptUrl));
                              } catch {}
                            }}
                            className="inline-flex items-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            Copiar link
                          </button>
                        )}
                        {inv.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="inline-flex items-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Revogar
                          </button>
                        )}
                      </div>
                    </div>

                    {inv.acceptUrl && inv.status === "PENDING" && (
                      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3 text-[11px] text-gray-600 break-all">
                        {inv.acceptUrl}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">Nenhum convite enviado ainda.</div>
            )}
          </StatCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
