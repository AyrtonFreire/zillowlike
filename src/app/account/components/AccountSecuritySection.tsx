"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Activity, CheckCircle2, Clock3, KeyRound, Loader2, ShieldAlert, XCircle } from "lucide-react";
import AccountReauthModal from "@/components/AccountReauthModal";
import { Button } from "@/components/ui/Button";
import { InlineFeedbackBanner, SectionCard, StatusBadge } from "@/app/profile/components/ProfilePrimitives";

type ProtectionItem = {
  key: string;
  label: string;
  ok: boolean;
};

type SecuritySession = {
  id: string;
  provider: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

type SecurityActivity = {
  id: string;
  action: string;
  level: string;
  message?: string | null;
  actorEmail?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
};

type SecurityResponse = {
  success: true;
  overview: {
    protectionScore: number;
    backupCodesUnused: number;
    currentSessionHash: string;
    recentReauth: boolean;
    recommendations: string[];
  };
  protectionItems: ProtectionItem[];
  sessions: SecuritySession[];
  recentActivity: SecurityActivity[];
};

type PendingSecurityAction =
  | { type: "revoke-others" }
  | { type: "revoke-session"; sessionHash: string }
  | null;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function providerLabel(provider: string) {
  if (provider === "credentials") return "Senha";
  if (provider === "google") return "Google";
  if (provider === "github") return "GitHub";
  return provider || "Sessão";
}

function actionLabel(action: PendingSecurityAction) {
  if (!action) return "continuar com esta ação";
  if (action.type === "revoke-others") return "encerrar outras sessões";
  return "encerrar uma sessão específica";
}

export function AccountSecuritySection() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<SecurityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthMeta, setReauthMeta] = useState({ hasPassword: false, email: null as string | null });
  const [pendingAction, setPendingAction] = useState<PendingSecurityAction>(null);

  const loadSecurity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/account/security", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Não foi possível carregar sua segurança agora.");
      }
      setData(payload as SecurityResponse);
    } catch (nextError: any) {
      setError(nextError?.message || "Não foi possível carregar sua segurança agora.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void loadSecurity();
      return;
    }
    if (status !== "loading") {
      setLoading(false);
    }
  }, [loadSecurity, status]);

  const openReauth = useCallback(async (action: PendingSecurityAction) => {
    try {
      const response = await fetch("/api/auth/reauth/status", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      setReauthMeta({
        hasPassword: Boolean(payload?.hasPassword),
        email: payload?.email || null,
      });
    } catch {
      setReauthMeta({ hasPassword: false, email: session?.user?.email || null });
    }
    setPendingAction(action);
    setReauthOpen(true);
  }, [session?.user?.email]);

  const executeAction = useCallback(async (action: PendingSecurityAction) => {
    if (!action) return;

    const key = action.type === "revoke-others" ? "revoke-others" : action.sessionHash;
    setWorking(key);
    try {
      const response =
        action.type === "revoke-others"
          ? await fetch("/api/account/security/sessions", { method: "POST" })
          : await fetch(`/api/account/security/sessions/${action.sessionHash}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload?.code === "RECENT_REAUTH_REQUIRED") {
          await openReauth(action);
          return;
        }
        throw new Error(payload?.error || "Não foi possível concluir a ação na sessão.");
      }
      setPendingAction(null);
      await loadSecurity();
    } catch (nextError: any) {
      setError(nextError?.message || "Não foi possível concluir a ação na sessão.");
    } finally {
      setWorking(null);
    }
  }, [loadSecurity, openReauth]);

  const handleReauthSuccess = useCallback(async () => {
    const action = pendingAction;
    setReauthOpen(false);
    await executeAction(action);
  }, [executeAction, pendingAction]);

  const scoreTone = useMemo(() => {
    const score = data?.overview.protectionScore || 0;
    if (score >= 80) return "success" as const;
    if (score >= 50) return "warning" as const;
    return "error" as const;
  }, [data?.overview.protectionScore]);

  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow="Conta e proteção"
        title="Sessões, segurança e recuperação"
        description="Revise o básico de proteção da conta sem sair desta página."
        actions={
          data ? <StatusBadge tone={scoreTone} label={`Proteção ${data.overview.protectionScore}%`} /> : null
        }
      >
        {error ? <InlineFeedbackBanner tone="error" title="Falha ao carregar segurança" message={error} /> : null}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-neutral-500">
            <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
          </div>
        ) : !data ? (
          <InlineFeedbackBanner tone="warning" title="Segurança indisponível agora" message="Tente novamente em instantes para revisar sessões e atividade recente." />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-neutral-200 bg-gradient-to-br from-white via-white to-neutral-50 p-5 shadow-sm shadow-black/5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-neutral-950">Nível atual</div>
                    <p className="mt-1 text-sm text-neutral-600">Sua proteção melhora quando recuperação, senha e sessões estão organizadas.</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-right shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Score</div>
                    <div className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">{data.overview.protectionScore}%</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data.protectionItems.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                        {item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-amber-600" />}
                        {item.label}
                      </div>
                      <p className="mt-2 text-sm text-neutral-600">{item.ok ? "Tudo certo" : "Vale configurar"}</p>
                    </div>
                  ))}
                </div>

                {data.overview.recommendations.length ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-sm font-semibold text-amber-900">O que vale fazer agora</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {data.overview.recommendations.map((item) => (
                        <span key={item} className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm shadow-black/5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-neutral-950">Sessões conhecidas</div>
                    <p className="mt-1 text-sm text-neutral-600">Encerre acessos antigos sem procurar outra página.</p>
                  </div>
                  <Button
                    variant="secondary"
                    leftIcon={working === "revoke-others" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    onClick={() => {
                      void executeAction({ type: "revoke-others" });
                    }}
                    disabled={working !== null}
                  >
                    Encerrar outras sessões
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {data.sessions.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-neutral-900">{item.isCurrent ? "Sessão atual" : `Sessão ${providerLabel(item.provider)}`}</div>
                            <StatusBadge tone={item.isCurrent ? "success" : "neutral"} label={item.isCurrent ? "Atual" : providerLabel(item.provider)} />
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-neutral-600">
                            <div>Iniciada em {formatDate(item.createdAt)}</div>
                            <div>Expira em {formatDate(item.expiresAt)}</div>
                          </div>
                        </div>
                        {!item.isCurrent ? (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              void executeAction({ type: "revoke-session", sessionHash: item.id });
                            }}
                            disabled={working !== null}
                            leftIcon={working === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                          >
                            Encerrar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm shadow-black/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-950">Atividade recente</div>
                    <p className="mt-1 text-sm text-neutral-600">Mudanças sensíveis e confirmações importantes da conta.</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {data.recentActivity.length ? (
                    data.recentActivity.map((event) => (
                      <div key={event.id} className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-neutral-900">{event.message || event.action.replace(/_/g, " ")}</div>
                            <p className="mt-1 text-sm text-neutral-600">{event.action}</p>
                          </div>
                          <div className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDate(event.createdAt)}
                          </div>
                        </div>
                        {event.metadata?.ip ? <div className="mt-3 text-xs text-neutral-500">IP: {String(event.metadata.ip)}</div> : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
                      Ainda não há eventos recentes para mostrar.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-neutral-200 bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-800 p-5 text-white shadow-lg shadow-teal-950/15">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Resumo rápido</div>
                <div className="mt-3 space-y-3 text-sm text-white/90">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                    {data.overview.backupCodesUnused > 0
                      ? `${data.overview.backupCodesUnused} código(s) de backup ainda disponíveis.`
                      : "Nenhum código de backup disponível no momento."}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                    {data.overview.recentReauth
                      ? "Sua identidade foi confirmada recentemente para ações sensíveis."
                      : "Ações sensíveis pedem confirmação extra quando necessário."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <AccountReauthModal
        isOpen={reauthOpen}
        onClose={() => {
          setReauthOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handleReauthSuccess}
        actionLabel={actionLabel(pendingAction)}
        email={reauthMeta.email}
        hasPassword={reauthMeta.hasPassword}
      />
    </div>
  );
}
