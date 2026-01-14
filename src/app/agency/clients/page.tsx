"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Drawer from "@/components/ui/Drawer";
import { X, Plus, UserRound, Phone, Mail, MapPin } from "lucide-react";

type ClientStatus = "ACTIVE" | "PAUSED";

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  preference: {
    city: string;
    state: string;
    scope: "PORTFOLIO" | "MARKET";
    updatedAt: string | null;
  } | null;
};

type ApiResponse = {
  success: boolean;
  team: { id: string; name: string } | null;
  clients: ClientRow[];
  page: number;
  pageSize: number;
  total: number;
  error?: string;
};

type CreateResponse = {
  success: boolean;
  client?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: ClientStatus;
    notes: string | null;
  };
  error?: string;
};

function roleFromSession(session: any) {
  return session?.user?.role || session?.role || "USER";
}

export default function AgencyClientsPage() {
  const { data: session, status } = useSession();

  const role = useMemo(() => roleFromSession(session as any), [session]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>("Clientes");

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(24);
  const [total, setTotal] = useState<number>(0);

  const [qDraft, setQDraft] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "ALL">("ALL");

  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const canUse = role === "AGENCY" || role === "ADMIN";

  const fetchClients = async (opts?: { silent?: boolean; page?: number }) => {
    try {
      setError(null);
      if (!opts?.silent) setLoading(true);

      const p = typeof opts?.page === "number" ? opts.page : page;

      const qs = new URLSearchParams();
      qs.set("page", String(p));
      qs.set("pageSize", String(pageSize));
      if (qDraft.trim()) qs.set("q", qDraft.trim());
      if (statusFilter !== "ALL") qs.set("status", statusFilter);

      const res = await fetch(`/api/agency/clients?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos carregar os clientes agora.");
      }

      setTeamName(json.team?.name ? `Clientes — ${json.team.name}` : "Clientes");
      setClients(Array.isArray(json.clients) ? json.clients : []);
      setTotal(typeof json.total === "number" ? json.total : 0);
      setPage(typeof json.page === "number" ? json.page : p);
    } catch (e: any) {
      setError(e?.message || "Não conseguimos carregar os clientes agora.");
      setClients([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!canUse) {
      setLoading(false);
      return;
    }
    void fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canUse]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!canUse) return;
    const t = window.setTimeout(() => {
      void fetchClients({ silent: true, page: 1 });
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDraft, statusFilter]);

  const totalPages = useMemo(() => {
    const safeTotal = Math.max(0, total);
    return Math.max(1, Math.ceil(safeTotal / pageSize));
  }, [total, pageSize]);

  const pageSummary = useMemo(() => {
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(total, page * pageSize);
    return { start, end };
  }, [page, pageSize, total]);

  const statusCounts = useMemo(() => {
    const active = clients.filter((c) => c.status === "ACTIVE").length;
    const paused = clients.filter((c) => c.status === "PAUSED").length;
    return { active, paused };
  }, [clients]);

  const resetCreate = () => {
    setCreateName("");
    setCreateEmail("");
    setCreatePhone("");
    setCreateError(null);
  };

  const submitCreate = async () => {
    try {
      setCreateError(null);
      const name = createName.trim();
      if (!name) {
        setCreateError("Informe o nome do cliente.");
        return;
      }

      setCreating(true);

      const payload: any = { name };
      if (createEmail.trim()) payload.email = createEmail.trim();
      if (createPhone.trim()) payload.phone = createPhone.trim();

      const res = await fetch("/api/agency/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as CreateResponse | null;

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Não conseguimos criar o cliente agora.");
      }

      resetCreate();
      setCreateOpen(false);
      await fetchClients({ silent: true, page: 1 });
    } catch (e: any) {
      setCreateError(e?.message || "Não conseguimos criar o cliente agora.");
    } finally {
      setCreating(false);
    }
  };

  if (status === "loading" || loading) {
    return <CenteredSpinner message="Carregando clientes..." />;
  }

  if (!canUse) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Somente contas de agência podem acessar esta área."
        action={
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
          >
            Voltar
          </Link>
        }
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Erro ao carregar clientes"
        description={error}
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  return (
    <div className="py-2 space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <input
                value={qDraft}
                onChange={(e) => setQDraft(String(e.target.value))}
                placeholder="Nome, e-mail, telefone..."
                className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              />
              {qDraft ? (
                <button
                  type="button"
                  onClick={() => setQDraft("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                  aria-label="Limpar busca"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="w-full lg:w-56">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ClientStatus | "ALL")}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="PAUSED">Pausados</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setQDraft("");
              setStatusFilter("ALL");
            }}
            disabled={!qDraft && statusFilter === "ALL"}
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold text-gray-500">Clientes</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{total}</div>
          <div className="mt-1 text-xs text-gray-500">No time</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold text-gray-500">Ativos</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{statusCounts.active}</div>
          <div className="mt-1 text-xs text-gray-500">Na página atual</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-[11px] font-semibold text-gray-500">Pausados</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{statusCounts.paused}</div>
          <div className="mt-1 text-xs text-gray-500">Na página atual</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{teamName}</div>
            <div className="mt-1 text-xs text-gray-500">Clientes vinculados ao time (visão da agência).</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={creating}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-70"
            >
              <Plus className="w-4 h-4 mr-2" />
              + Cliente
            </button>
          </div>
        </div>

        <div className="mt-6">
          {clients.length === 0 ? (
            <EmptyState
              icon={<UserRound className="w-10 h-10 text-gray-400" />}
              title="Nenhum cliente encontrado"
              description="Crie seu primeiro cliente acima ou ajuste os filtros."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div>
                  Mostrando {pageSummary.start}-{pageSummary.end} de {total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (page <= 1) return;
                      void fetchClients({ silent: true, page: page - 1 });
                    }}
                    disabled={page <= 1}
                    className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Anterior
                  </button>
                  <div className="text-gray-600">
                    Página {page} de {totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (page >= totalPages) return;
                      void fetchClients({ silent: true, page: page + 1 });
                    }}
                    disabled={page >= totalPages}
                    className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Próxima
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {clients.map((c) => (
                  <Link
                    key={c.id}
                    href={`/agency/clients/${encodeURIComponent(c.id)}`}
                    className="block rounded-2xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{c.name}</div>
                        <div className="mt-1 flex flex-col gap-1 text-xs text-gray-600">
                          {c.email ? (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">{c.email}</span>
                            </div>
                          ) : null}
                          {c.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">{c.phone}</span>
                            </div>
                          ) : null}
                          {c.preference?.city && c.preference?.state ? (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">
                                {c.preference.city}/{c.preference.state} · {c.preference.scope}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className={`shrink-0 px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                          c.status === "ACTIVE"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        {c.status === "ACTIVE" ? "Ativo" : "Pausado"}
                      </div>
                    </div>

                    {c.notes ? <div className="mt-3 text-xs text-gray-500 line-clamp-2">{c.notes}</div> : null}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetCreate();
        }}
        title="Novo cliente"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitCreate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nome</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(String(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              placeholder="Ex: Maria Silva"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail (opcional)</label>
            <input
              value={createEmail}
              onChange={(e) => setCreateEmail(String(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              placeholder="maria@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone (opcional)</label>
            <input
              value={createPhone}
              onChange={(e) => setCreatePhone(String(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
              placeholder="(11) 99999-9999"
              autoComplete="tel"
            />
          </div>

          {createError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {createError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                resetCreate();
              }}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-70"
            >
              {creating ? "Criando..." : "Criar cliente"}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
