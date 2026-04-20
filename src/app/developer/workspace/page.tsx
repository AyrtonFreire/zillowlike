"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Building2, Mail, Shield, UserPlus, Users } from "lucide-react";
import { InlineFeedbackBanner } from "@/app/profile/components/ProfilePrimitives";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";

type WorkspaceMemberRole = "OWNER" | "ASSISTANT" | "MEMBER";

type DeveloperWorkspaceResponse = {
  success: boolean;
  profile: {
    id: string;
    displayName: string;
    legalName: string;
    brandName?: string | null;
    cnpj: string;
    phone?: string | null;
    website?: string | null;
    businessType?: string | null;
    description?: string | null;
    logoUrl?: string | null;
  };
  workspace: {
    teamId: string;
    teamName: string | null;
    teamOwnerId: string | null;
    viewerUserId: string;
    viewerWorkspaceRole: WorkspaceMemberRole | null;
    canManageWorkspace: boolean;
    canTransferOwner: boolean;
    membersCount: number;
    invitesCount: number;
    developmentProjectsCount: number;
    leadsCount: number;
  };
  members: Array<{
    id: string;
    userId: string;
    role: WorkspaceMemberRole;
    queuePosition?: number | null;
    createdAt?: string | null;
    isOwner: boolean;
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      username?: string | null;
      role?: string | null;
    } | null;
  }>;
  invites: Array<{
    id: string;
    email: string;
    role: WorkspaceMemberRole;
    status: string;
    expiresAt?: string | null;
    createdAt?: string | null;
    acceptedAt?: string | null;
    revokedAt?: string | null;
    acceptUrl?: string | null;
  }>;
};

type InlineFeedback = {
  tone: "success" | "error" | "info";
  title: string;
  message?: string;
} | null;

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{value}</div>
      <div className="mt-2 text-sm text-neutral-600">{helper}</div>
    </div>
  );
}

function roleLabel(role?: string | null) {
  const normalized = String(role || "").toUpperCase();
  if (normalized === "OWNER") return "Titular";
  if (normalized === "ASSISTANT") return "Assistente";
  return "Membro";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DeveloperWorkspacePage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<InlineFeedback>(null);
  const [workspace, setWorkspace] = useState<DeveloperWorkspaceResponse | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>("MEMBER");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [newOwnerId, setNewOwnerId] = useState("");
  const [ownerBusy, setOwnerBusy] = useState(false);

  const fetchWorkspace = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      setError(null);
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);

      const response = await fetch("/api/developer/workspace", { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos carregar o workspace da incorporadora.");
      }

      setWorkspace(data as DeveloperWorkspaceResponse);
    } catch (err: any) {
      console.error("Error loading developer workspace:", err);
      setError(err?.message || "Não conseguimos carregar o workspace da incorporadora.");
      setWorkspace(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/developer/workspace");
      return;
    }
    if (status !== "authenticated") return;
    void fetchWorkspace();
  }, [fetchWorkspace, router, status]);

  useEffect(() => {
    if (!workspace?.members?.length) {
      setNewOwnerId("");
      return;
    }

    const candidate = workspace.members.find(
      (member) => !member.isOwner && member.role !== "ASSISTANT"
    );
    setNewOwnerId(candidate?.userId || "");
  }, [workspace?.members]);

  const canManageWorkspace = Boolean(workspace?.workspace.canManageWorkspace);
  const canTransferOwner = Boolean(workspace?.workspace.canTransferOwner);

  const ownerCandidates = useMemo(
    () => (workspace?.members || []).filter((member) => !member.isOwner && member.role !== "ASSISTANT"),
    [workspace?.members]
  );

  const dismissFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  async function handleInviteMember(event: FormEvent) {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    try {
      setInviteSaving(true);
      setFeedback(null);

      const response = await fetch("/api/developer/workspace/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos enviar o convite agora.");
      }

      if (data?.alreadyMember) {
        setInviteEmail("");
        setFeedback({
          tone: "info",
          title: "Usuário já faz parte do workspace",
          message: "Nenhum novo convite foi criado porque esta conta já está vinculada ao time.",
        });
        await fetchWorkspace({ silent: true });
        return;
      }

      setInviteEmail("");
      setInviteRole("MEMBER");
      setFeedback({
        tone: "success",
        title: "Convite enviado",
        message: `O convite para ${email} foi criado com o papel ${roleLabel(inviteRole).toLowerCase()}.`,
      });
      await fetchWorkspace({ silent: true });
    } catch (err: any) {
      console.error("Error inviting developer workspace member:", err);
      setFeedback({
        tone: "error",
        title: "Não foi possível enviar o convite",
        message: err?.message || "Não conseguimos enviar o convite agora.",
      });
    } finally {
      setInviteSaving(false);
    }
  }

  async function handleUpdateMemberRole(targetUserId: string, role: WorkspaceMemberRole) {
    if (role === "OWNER") return;

    const targetMember = workspace?.members.find((member) => member.userId === targetUserId);
    const memberLabel = targetMember?.user?.name || targetMember?.user?.email || targetMember?.user?.username || "O membro";

    try {
      setMemberBusyId(targetUserId);
      setFeedback(null);

      const response = await fetch(`/api/developer/workspace/members/${targetUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos atualizar este membro agora.");
      }

      setFeedback({
        tone: "success",
        title: "Papel atualizado",
        message: `${memberLabel} agora atua como ${roleLabel(role).toLowerCase()} no workspace.`,
      });
      await fetchWorkspace({ silent: true });
    } catch (err: any) {
      console.error("Error updating developer workspace member:", err);
      setFeedback({
        tone: "error",
        title: "Não foi possível atualizar o papel",
        message: err?.message || "Não conseguimos atualizar este membro agora.",
      });
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleRemoveMember(targetUserId: string) {
    const targetMember = workspace?.members.find((member) => member.userId === targetUserId);
    const memberLabel = targetMember?.user?.name || targetMember?.user?.email || targetMember?.user?.username || "O membro";
    const confirmed = window.confirm("Remover este membro do workspace?");
    if (!confirmed) return;

    try {
      setMemberBusyId(targetUserId);
      setFeedback(null);

      const response = await fetch(`/api/developer/workspace/members/${targetUserId}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos remover este membro agora.");
      }

      setFeedback({
        tone: "success",
        title: "Membro removido",
        message: `${memberLabel} não tem mais acesso ao workspace da incorporadora.`,
      });
      await fetchWorkspace({ silent: true });
    } catch (err: any) {
      console.error("Error removing developer workspace member:", err);
      setFeedback({
        tone: "error",
        title: "Não foi possível remover o membro",
        message: err?.message || "Não conseguimos remover este membro agora.",
      });
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleTransferOwner() {
    if (!newOwnerId) return;
    const nextOwner = ownerCandidates.find((member) => member.userId === newOwnerId);
    const nextOwnerLabel = nextOwner?.user?.name || nextOwner?.user?.email || nextOwner?.user?.username || "O membro selecionado";
    const confirmed = window.confirm("Transferir a titularidade deste workspace para o membro selecionado?");
    if (!confirmed) return;

    try {
      setOwnerBusy(true);
      setFeedback(null);

      const response = await fetch("/api/developer/workspace/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos transferir a titularidade agora.");
      }

      setFeedback({
        tone: "success",
        title: "Titularidade transferida",
        message: `${nextOwnerLabel} agora é a pessoa titular deste workspace.`,
      });
      await fetchWorkspace({ silent: true });
    } catch (err: any) {
      console.error("Error transferring developer workspace owner:", err);
      setFeedback({
        tone: "error",
        title: "Não foi possível transferir a titularidade",
        message: err?.message || "Não conseguimos transferir a titularidade agora.",
      });
    } finally {
      setOwnerBusy(false);
    }
  }

  if (loading) {
    return <CenteredSpinner message="Carregando workspace da incorporadora..." />;
  }

  return (
    <DashboardLayout
      title="Workspace da incorporadora"
      description="Gerencie membros, convites e papéis do time que opera o perfil DEVELOPER."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Incorporadora", href: "/developer" },
        { label: "Workspace" },
      ]}
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/developer"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao painel
          </Link>
          <Link
            href="/developer/profile"
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            Editar perfil
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {feedback ? (
          <InlineFeedbackBanner title={feedback.title} message={feedback.message} tone={feedback.tone} onDismiss={dismissFeedback} />
        ) : null}

        {workspace ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Membros" value={workspace.workspace.membersCount} helper="Pessoas com acesso ao workspace" />
              <MetricCard label="Convites" value={workspace.workspace.invitesCount} helper="Convites ativos e históricos" />
              <MetricCard label="Empreendimentos" value={workspace.workspace.developmentProjectsCount} helper="Portfólio do workspace" />
              <MetricCard label="Leads" value={workspace.workspace.leadsCount} helper="Leads vinculados ao time" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="space-y-6">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        <Building2 className="h-3.5 w-3.5" />
                        {workspace.profile.displayName}
                      </div>
                      <h2 className="mt-3 text-xl font-semibold text-neutral-950">{workspace.workspace.teamName || workspace.profile.legalName}</h2>
                      <p className="mt-1 text-sm text-neutral-600">Papel atual: {roleLabel(workspace.workspace.viewerWorkspaceRole)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchWorkspace({ silent: true })}
                      disabled={refreshing}
                      className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
                    >
                      {refreshing ? "Atualizando..." : "Atualizar"}
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">CNPJ</div>
                      <div className="mt-2 text-sm font-semibold text-neutral-900">{workspace.profile.cnpj}</div>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Permissões</div>
                      <div className="mt-2 text-sm font-semibold text-neutral-900">
                        {canManageWorkspace ? "Pode gerenciar membros e convites" : "Acesso apenas de leitura operacional"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-950">Membros do workspace</h3>
                      <p className="mt-1 text-sm text-neutral-600">Controle quem opera empreendimentos e leads dentro do perfil DEVELOPER.</p>
                    </div>
                    <Users className="h-5 w-5 text-neutral-400" />
                  </div>

                  <div className="mt-4 space-y-3">
                    {workspace.members.length === 0 ? (
                      <EmptyState
                        compact
                        icon={<Users className="h-8 w-8" />}
                        title="Nenhum membro no workspace"
                        description="Assim que novas pessoas forem adicionadas ao time, a gestão de papéis aparecerá aqui."
                      />
                    ) : (
                      workspace.members.map((member) => {
                      const label = member.user?.name || member.user?.email || member.user?.username || "Membro";
                      const busy = memberBusyId === member.userId;
                      return (
                        <div key={member.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-neutral-950">{label}</div>
                              <div className="mt-1 text-xs text-neutral-500">
                                {member.user?.email || member.user?.username || "Sem identificador público"}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                                <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-neutral-700">
                                  {roleLabel(member.role)}
                                </span>
                                {member.isOwner ? (
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                                    Titular atual
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(event) => void handleUpdateMemberRole(member.userId, event.target.value as WorkspaceMemberRole)}
                                disabled={!canManageWorkspace || member.isOwner || busy}
                                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-neutral-100"
                              >
                                <option value="MEMBER">Membro</option>
                                <option value="ASSISTANT">Assistente</option>
                                {member.isOwner ? <option value="OWNER">Titular</option> : null}
                              </select>
                              {!member.isOwner ? (
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveMember(member.userId)}
                                  disabled={!canManageWorkspace || busy}
                                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {busy ? "Salvando..." : "Remover"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                      })
                    )}
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-neutral-400" />
                    <h3 className="text-base font-semibold text-neutral-950">Convidar membro</h3>
                  </div>
                  <p className="mt-2 text-sm text-neutral-600">O convite funciona para contas existentes de corretor na plataforma.</p>

                  {!canManageWorkspace ? (
                    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                      Seu papel atual permite acompanhar a composição do time, mas não convidar ou editar membros.
                    </div>
                  ) : null}

                  <form className="mt-4 space-y-3" onSubmit={handleInviteMember}>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="email@exemplo.com"
                      disabled={!canManageWorkspace || inviteSaving}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 disabled:bg-neutral-100"
                    />
                    <select
                      value={inviteRole}
                      onChange={(event) => setInviteRole(event.target.value as WorkspaceMemberRole)}
                      disabled={!canManageWorkspace || inviteSaving}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 disabled:bg-neutral-100"
                    >
                      <option value="MEMBER">Membro</option>
                      <option value="ASSISTANT">Assistente</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!canManageWorkspace || inviteSaving || !inviteEmail.trim()}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {inviteSaving ? "Enviando..." : "Enviar convite"}
                    </button>
                  </form>
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-neutral-400" />
                    <h3 className="text-base font-semibold text-neutral-950">Convites</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    {workspace.invites.length === 0 ? (
                      <EmptyState
                        compact
                        icon={<Mail className="h-8 w-8" />}
                        title="Nenhum convite registrado"
                        description="Os convites enviados para ampliar o time operacional aparecerão aqui com status e datas."
                      />
                    ) : (
                      workspace.invites.map((invite) => (
                        <div key={invite.id} className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                          <div className="text-sm font-semibold text-neutral-950">{invite.email}</div>
                          <div className="mt-1 text-xs text-neutral-500">
                            {roleLabel(invite.role)} · {invite.status} · criado em {formatDate(invite.createdAt)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-neutral-400" />
                    <h3 className="text-base font-semibold text-neutral-950">Titularidade</h3>
                  </div>
                  <p className="mt-2 text-sm text-neutral-600">Transfira o controle do workspace para outro membro elegível quando necessário.</p>

                  {ownerCandidates.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      <select
                        value={newOwnerId}
                        onChange={(event) => setNewOwnerId(event.target.value)}
                        disabled={!canTransferOwner || ownerBusy}
                        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 disabled:bg-neutral-100"
                      >
                        {ownerCandidates.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.user?.name || member.user?.email || member.user?.username || member.userId}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleTransferOwner()}
                        disabled={!canTransferOwner || ownerBusy || !newOwnerId}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {ownerBusy ? "Transferindo..." : "Transferir titularidade"}
                      </button>
                    </div>
                  ) : (
                    <EmptyState
                      compact
                      icon={<Shield className="h-8 w-8" />}
                      title="Nenhum membro elegível no momento"
                      description={canTransferOwner ? "Adicione ou promova um membro elegível para disponibilizar a transferência de titularidade." : "Somente a pessoa titular atual pode transferir o controle deste workspace."}
                    />
                  )}
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
