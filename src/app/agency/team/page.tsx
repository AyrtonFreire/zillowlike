"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";

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

  return (
    <DashboardLayout
      title="Time da Agência"
      description="Gerencie seu time, convites e preferências de distribuição."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Agência", href: "/agency/dashboard" }, { label: "Time" }]}
      actions={
        <Link
          href={team?.id ? `/broker/teams/${team.id}/crm` : "/broker/teams"}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-semibold hover:bg-white/20"
        >
          Abrir CRM
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>
        )}

        {insightsError && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
            {insightsError}
          </div>
        )}

        {insights?.team && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Qualidade / SLA do time</div>
                <div className="mt-1 text-sm text-gray-600">{insights.summary}</div>
              </div>
              <Link
                href={`/broker/teams/${insights.team.id}/crm`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold"
              >
                Abrir CRM
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2">
                <div className="text-[11px] text-gray-500">Ativos</div>
                <div className="text-lg font-semibold text-gray-900">{insights.funnel.activeTotal}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2">
                <div className="text-[11px] text-gray-500">Pendentes (SLA)</div>
                <div className="text-lg font-semibold text-gray-900">{insights.sla.pendingReplyTotal}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2">
                <div className="text-[11px] text-gray-500">Sem responsável</div>
                <div className="text-lg font-semibold text-gray-900">{insights.funnel.unassigned}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2">
                <div className="text-[11px] text-gray-500">Novos 24h</div>
                <div className="text-lg font-semibold text-gray-900">{insights.funnel.newLast24h}</div>
              </div>
            </div>

            {Array.isArray(insights.members) && insights.members.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-4 text-left font-semibold">Corretor</th>
                      <th className="py-2 pr-4 text-left font-semibold">Ativos</th>
                      <th className="py-2 pr-4 text-left font-semibold">Pendentes</th>
                      <th className="py-2 pr-4 text-left font-semibold">Parados (3d+)</th>
                      <th className="py-2 text-left font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.members.map((m) => (
                      <tr key={m.userId} className="border-b border-gray-100">
                        <td className="py-2 pr-4">
                          <div className="font-medium text-gray-900">{m.name || m.email || "Membro"}</div>
                          <div className="text-[11px] text-gray-500">{m.email || ""}</div>
                        </td>
                        <td className="py-2 pr-4 text-gray-700">{m.activeLeads}</td>
                        <td className="py-2 pr-4 text-gray-700">{m.pendingReply}</td>
                        <td className="py-2 pr-4 text-gray-700">{m.stalledLeads}</td>
                        <td className="py-2">
                          <Link
                            href={`/broker/teams/${insights.team?.id}/crm?realtorId=${encodeURIComponent(m.userId)}`}
                            className="inline-flex items-center text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                          >
                            Ver no CRM
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {insights.funnel.unassigned > 0 && (
              <div className="mt-3">
                <Link
                  href={`/broker/teams/${insights.team.id}/crm?realtorId=unassigned`}
                  className="inline-flex items-center text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                >
                  Ver leads sem responsável
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="text-sm font-semibold text-gray-900 mb-4">Perfil da agência</div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-700 mb-1">Nome</label>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-700 mb-1">Telefone</label>
                <input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="text-[11px] text-gray-500">
                CNPJ: <span className="font-medium text-gray-700">{agencyProfile?.cnpj || "-"}</span>
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingProfile ? "Salvando..." : "Salvar perfil"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="text-sm font-semibold text-gray-900 mb-4">Distribuição de leads do time</div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-700 mb-1">Modo</label>
                <select
                  value={leadDistributionMode}
                  onChange={(e) => setLeadDistributionMode(e.target.value as TeamLeadDistributionMode)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="ROUND_ROBIN">Round-robin</option>
                  <option value="CAPTURER_FIRST">Prioridade do captador/parceiro</option>
                  <option value="MANUAL">Manual (sem responsável)</option>
                </select>
              </div>

              <div className="text-[11px] text-gray-500">
                Padrão recomendado: round-robin. No modo manual, o lead aparece no CRM do time e vocês atribuem manualmente.
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingSettings ? "Salvando..." : "Salvar preferências"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-sm font-semibold text-gray-900 mb-4">Membros</div>
          {team?.members?.length ? (
            <div className="space-y-2 text-sm text-gray-700">
              {team.members.map((m) => (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{m.name || m.email || "Membro"}</div>
                    <div className="text-[11px] text-gray-500 truncate">{m.email || ""}</div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    {team?.id && (role === "ADMIN" || team.role === "OWNER") && String(m.role).toUpperCase() !== "OWNER" ? (
                      <select
                        value={String(m.role).toUpperCase()}
                        onChange={(e) => {
                          const next = String(e.target.value).toUpperCase() as TeamMemberRole;
                          if (next !== String(m.role).toUpperCase()) {
                            void handleUpdateMemberRole(m.id, next);
                          }
                        }}
                        disabled={memberBusyId === m.id}
                        className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-700"
                      >
                        <option value="AGENT">AGENTE</option>
                        <option value="ASSISTANT">ASSISTENTE</option>
                      </select>
                    ) : (
                      <div className="text-[11px] text-gray-500 uppercase">{m.role}</div>
                    )}

                    {team?.id && (role === "ADMIN" || team.role === "OWNER") && String(m.role).toUpperCase() !== "OWNER" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        disabled={memberBusyId === m.id}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {(role === "ADMIN" || team?.role === "OWNER") && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-white p-3">
                  <div className="text-xs font-semibold text-gray-900 mb-2">Transferir titularidade</div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1">
                      <label className="block text-[11px] text-gray-600 mb-1">Novo dono</label>
                      <select
                        value={newOwnerId}
                        onChange={(e) => setNewOwnerId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                      className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      {ownerTransferBusy ? "Transferindo..." : "Transferir"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Nenhum membro encontrado.</div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-sm font-semibold text-gray-900 mb-4">Convites</div>

          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end mb-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-700 mb-1">E-mail do corretor</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="corretor@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="sm:w-48">
              <label className="block text-xs text-gray-700 mb-1">Papel no time</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamMemberRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="AGENT">Agente</option>
                <option value="ASSISTANT">Assistente</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting || !team?.id}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold disabled:opacity-60"
            >
              {inviting ? "Enviando..." : "Enviar convite"}
            </button>
          </form>

          {invites.length ? (
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-xs text-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{inv.email}</div>
                      <div className="text-[11px] text-gray-500">Status: {inv.status} | Papel: {inv.role}</div>
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
                          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Copiar link
                        </button>
                      )}
                      {inv.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Revogar
                        </button>
                      )}
                    </div>
                  </div>

                  {inv.acceptUrl && inv.status === "PENDING" && (
                    <div className="mt-2 text-[11px] text-gray-500 break-all">
                      {inv.acceptUrl}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Nenhum convite enviado ainda.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
