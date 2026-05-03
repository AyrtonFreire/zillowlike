"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LegacySettingsRedirect } from "@/app/account/components/LegacySettingsRedirect";
import { Activity, CheckCircle2, Clock3, KeyRound, Loader2, LogOut, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import SiteFooter from "@/components/Footer";
import AccountReauthModal from "@/components/AccountReauthModal";
import Button from "@/components/ui/Button";

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
  if (!action) return "continuar na central de segurança";
  if (action.type === "revoke-others") return "encerrar outras sessões";
  return "encerrar uma sessão específica";
}

export default function AccountSecurityPage() {
  return (
    <LegacySettingsRedirect
      section="security"
      title="Redirecionando a central de segurança"
      description="Sessões, score de proteção e atividade recente agora ficam dentro das configurações unificadas."
    />
  );
}

function LegacyAccountSecurityPage() {
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
        throw new Error(payload?.error || "Não foi possível carregar a central de segurança.");
      }
      setData(payload as SecurityResponse);
    } catch (nextError: any) {
      setError(nextError?.message || "Não foi possível carregar a central de segurança.");
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
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-rose-700 bg-rose-50 border-rose-200";
  }, [data?.overview.protectionScore]);

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-700" />
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <ShieldCheck className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h1 className="text-3xl font-bold text-gray-900">Central de segurança</h1>
          <p className="mt-3 text-gray-600">Entre para ver sessões, atividade recente e fatores de recuperação da sua conta.</p>
          <div className="mt-8">
            <Link href="/auth/signin" className="inline-flex">
              <Button>Fazer login</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Central de segurança
            </div>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">Proteção, sessões e recuperação</h1>
            <p className="mt-2 max-w-3xl text-gray-600">Acompanhe a proteção da sua conta, confirme ações sensíveis, encerre sessões conhecidas e revise a atividade recente em um único lugar.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/profile">
              <Button variant="secondary">Editar perfil</Button>
            </Link>
            <Button variant="secondary" leftIcon={<LogOut className="h-4 w-4" />} onClick={() => signOut({ callbackUrl: "/" })}>
              Sair
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">Nível atual</div>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900">Score de proteção da conta</h2>
                  <p className="mt-2 text-sm text-gray-600">Quanto maior o score, mais preparada sua conta fica para recuperação, mudanças sensíveis e confiança no perfil.</p>
                </div>
                <div className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-2xl font-bold ${scoreTone}`}>
                  <ShieldAlert className="h-6 w-6" />
                  {data?.overview.protectionScore || 0}%
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data?.protectionItems.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      {item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-amber-600" />}
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{item.ok ? "Ativo" : "Recomendado"}</p>
                  </div>
                ))}
              </div>

              {data?.overview.recommendations.length ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-sm font-semibold text-amber-900">Próximos passos recomendados</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.overview.recommendations.map((item) => (
                      <span key={item} className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Sessões conhecidas</h2>
                  <p className="mt-1 text-sm text-gray-600">Estas sessões continuam válidas enquanto não forem revogadas e permanecerem dentro do prazo ativo.</p>
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

              <div className="mt-5 space-y-3">
                {data?.sessions.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-gray-900">{item.isCurrent ? "Sessão atual" : `Sessão ${providerLabel(item.provider)}`}</div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.isCurrent ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>
                            {item.isCurrent ? "Atual" : providerLabel(item.provider)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
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
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Atividade recente</h2>
                  <p className="mt-1 text-sm text-gray-600">Acompanhe confirmações, alterações sensíveis e movimentações recentes relacionadas à sua conta.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {data?.recentActivity.length ? (
                  data.recentActivity.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{event.message || event.action.replace(/_/g, " ")}</div>
                          <p className="mt-1 text-sm text-gray-600">{event.action}</p>
                        </div>
                        <div className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(event.createdAt)}
                        </div>
                      </div>
                      {event.metadata?.ip ? (
                        <div className="mt-3 text-xs text-gray-500">IP: {String(event.metadata.ip)}</div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                    Ainda não há eventos recentes de segurança para mostrar.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm shadow-black/5">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">Atalhos úteis</div>
              <div className="mt-4 grid gap-3">
                <Link href="/profile" className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-sm font-semibold text-gray-900 transition hover:border-gray-300 hover:bg-white">
                  Atualizar identidade, recuperação e perfil público
                </Link>
                <Link href="/account" className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-sm font-semibold text-gray-900 transition hover:border-gray-300 hover:bg-white">
                  Voltar para o hub da conta
                </Link>
                <Link href="/account/communication" className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-sm font-semibold text-gray-900 transition hover:border-gray-300 hover:bg-white">
                  Revisar preferências de comunicação
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

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

      <SiteFooter />
    </main>
  );
}
