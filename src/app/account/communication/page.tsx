"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, Mail, Settings2 } from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import SiteFooter from "@/components/Footer";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import {
  EMAIL_FREQUENCIES,
  EMAIL_FREQUENCY_LABELS,
  EMAIL_INTERESTS,
  EMAIL_INTEREST_LABELS,
} from "@/lib/communication-preferences";

type PreferenceResponse = {
  subscription: {
    id: string | null;
    email: string;
    status: "ACTIVE" | "PAUSED" | "UNSUBSCRIBED";
    frequency: "INSTANT" | "DAILY" | "WEEKLY";
    city: string | null;
    state: string | null;
    interests: string[];
    subscribedToAlerts: boolean;
    subscribedToDigest: boolean;
    subscribedToGuides: boolean;
    subscribedToPriceDrops: boolean;
    updatedAt: string | null;
  } | null;
  savedSearches: Array<{
    id: string;
    label: string;
    frequency: string;
    alertsEnabled: boolean;
    lastAlertSentAt: string | null;
    createdAt: string;
  }>;
  summary: {
    totalSavedSearches: number;
    activeAlerts: number;
    inactiveAlerts: number;
  };
};

const initialState = {
  city: "",
  state: "",
  frequency: "WEEKLY",
  interests: ["BUY"],
  subscribedToAlerts: true,
  subscribedToDigest: true,
  subscribedToGuides: true,
  subscribedToPriceDrops: false,
  status: "ACTIVE",
  savedSearchesEnabled: true,
  savedSearchFrequency: "DAILY",
};

export default function CommunicationPreferencesPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PreferenceResponse | null>(null);
  const [form, setForm] = useState(initialState);

  const email = useMemo(() => {
    return data?.subscription?.email || session?.user?.email || "";
  }, [data?.subscription?.email, session?.user?.email]);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/email-subscriptions");
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          setError(payload?.error || "Não foi possível carregar suas preferências.");
          return;
        }
        setData(payload);
        setForm({
          city: payload.subscription?.city || "",
          state: payload.subscription?.state || "",
          frequency: payload.subscription?.frequency || "WEEKLY",
          interests: Array.isArray(payload.subscription?.interests) && payload.subscription.interests.length ? payload.subscription.interests : ["BUY"],
          subscribedToAlerts: payload.subscription?.subscribedToAlerts ?? true,
          subscribedToDigest: payload.subscription?.subscribedToDigest ?? true,
          subscribedToGuides: payload.subscription?.subscribedToGuides ?? true,
          subscribedToPriceDrops: payload.subscription?.subscribedToPriceDrops ?? false,
          status: payload.subscription?.status || "ACTIVE",
          savedSearchesEnabled: (payload.summary?.activeAlerts || 0) > 0,
          savedSearchFrequency: payload.savedSearches?.[0]?.frequency || payload.subscription?.frequency || "DAILY",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [status]);

  function toggleInterest(interest: string) {
    setForm((current) => {
      const exists = current.interests.includes(interest);
      const next = exists ? current.interests.filter((item) => item !== interest) : [...current.interests, interest];
      return {
        ...current,
        interests: next.length ? next : [interest],
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/email-subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: form.city || undefined,
          state: form.state || undefined,
          frequency: form.frequency,
          interests: form.interests,
          subscribedToAlerts: form.subscribedToAlerts,
          subscribedToDigest: form.subscribedToDigest,
          subscribedToGuides: form.subscribedToGuides,
          subscribedToPriceDrops: form.subscribedToPriceDrops,
          status: form.status,
          savedSearchesEnabled: form.savedSearchesEnabled,
          savedSearchFrequency: form.savedSearchFrequency,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(payload?.error || "Não foi possível salvar suas preferências.");
        return;
      }

      setData(payload);
      setMessage("Preferências atualizadas com sucesso.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Preferências de comunicação</h1>
          <p className="text-gray-600 mb-8">Entre para ajustar alertas, resumos e conteúdos enviados para o seu e-mail.</p>
          <Link href="/api/auth/signin">
            <Button>Fazer login</Button>
          </Link>
        </div>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-display">Preferências de comunicação</h1>
            <p className="text-gray-600 mt-1">Escolha quais alertas, resumos e conteúdos o OggaHub deve enviar para você.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/alerts">
              <Button variant="secondary">Ver alertas</Button>
            </Link>
            <Link href="/account">
              <Button variant="secondary">Voltar para conta</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">Seu e-mail de relacionamento</div>
                  <div className="text-sm text-gray-600">Usamos este e-mail para alertas de imóveis, resumos inteligentes e conteúdos práticos.</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="E-mail" value={email} disabled className="bg-gray-50" />
                <Select label="Status da assinatura" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as typeof current.status }))}>
                  <option value="ACTIVE">Ativa</option>
                  <option value="PAUSED">Pausada</option>
                  <option value="UNSUBSCRIBED">Cancelar envios</option>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Cidade prioritária" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="Ex: Petrolina" />
                <Input label="Estado" value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value.toUpperCase() }))} placeholder="PE" maxLength={10} />
                <Select label="Frequência principal" value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value as typeof current.frequency }))}>
                  {EMAIL_FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>{EMAIL_FREQUENCY_LABELS[frequency]}</option>
                  ))}
                </Select>
              </div>

              <div>
                <div className="text-sm font-medium text-neutral-700 mb-2">Temas de maior interesse</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  {EMAIL_INTERESTS.map((interest) => (
                    <Checkbox
                      key={interest}
                      checked={form.interests.includes(interest)}
                      onChange={() => toggleInterest(interest)}
                      label={EMAIL_INTEREST_LABELS[interest]}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900 mb-2">Tipos de e-mail</div>
                  <div className="space-y-1">
                    <Checkbox checked={form.subscribedToAlerts} onChange={(event) => setForm((current) => ({ ...current, subscribedToAlerts: event.target.checked }))} label="Alertas de novos imóveis para as suas buscas" />
                    <Checkbox checked={form.subscribedToDigest} onChange={(event) => setForm((current) => ({ ...current, subscribedToDigest: event.target.checked }))} label="Resumo inteligente com oportunidades relevantes" />
                    <Checkbox checked={form.subscribedToGuides} onChange={(event) => setForm((current) => ({ ...current, subscribedToGuides: event.target.checked }))} label="Conteúdo prático para comprar, alugar ou anunciar melhor" />
                    <Checkbox checked={form.subscribedToPriceDrops} onChange={(event) => setForm((current) => ({ ...current, subscribedToPriceDrops: event.target.checked }))} label="Avisos de queda de preço quando houver sinal relevante" />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="font-semibold text-gray-900 mb-2">Aplicar também aos seus alertas</div>
                  <Checkbox checked={form.savedSearchesEnabled} onChange={(event) => setForm((current) => ({ ...current, savedSearchesEnabled: event.target.checked }))} label="Manter alertas por e-mail ativos nas buscas salvas" />
                  <div className="mt-3">
                    <Select label="Frequência padrão dos alertas" value={form.savedSearchFrequency} onChange={(event) => setForm((current) => ({ ...current, savedSearchFrequency: event.target.value as typeof current.savedSearchFrequency }))}>
                      {EMAIL_FREQUENCIES.map((frequency) => (
                        <option key={frequency} value={frequency}>{EMAIL_FREQUENCY_LABELS[frequency]}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">Você pode pausar ou cancelar tudo a qualquer momento nesta página.</p>
                <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar preferências"}</Button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-gray-900 font-semibold mb-4">
                <Bell className="w-5 h-5 text-blue-600" />
                Resumo dos seus alertas
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="text-2xl font-bold text-gray-900">{data?.summary?.totalSavedSearches || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Buscas</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-2xl font-bold text-emerald-700">{data?.summary?.activeAlerts || 0}</div>
                  <div className="text-xs text-emerald-700 mt-1">Ativos</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <div className="text-2xl font-bold text-amber-700">{data?.summary?.inactiveAlerts || 0}</div>
                  <div className="text-xs text-amber-700 mt-1">Pausados</div>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/saved-searches" className="text-sm font-medium text-teal-700 hover:text-teal-800">Gerenciar buscas salvas</Link>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="font-semibold text-gray-900 mb-3">Buscas recentes com alerta</div>
              <div className="space-y-3">
                {(data?.savedSearches || []).slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="font-medium text-gray-900 text-sm">{item.label}</div>
                    <div className="mt-1 text-xs text-gray-500">{EMAIL_FREQUENCY_LABELS[(item.frequency as keyof typeof EMAIL_FREQUENCY_LABELS) || "DAILY"]} {item.alertsEnabled ? "· ativo" : "· pausado"}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {item.lastAlertSentAt ? `Último envio em ${new Date(item.lastAlertSentAt).toLocaleDateString("pt-BR")}` : "Ainda sem envio registrado"}
                    </div>
                  </div>
                ))}
                {!data?.savedSearches?.length && (
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">Você ainda não tem buscas salvas com alerta. Crie uma em <Link href="/alerts" className="font-medium text-teal-700">Meus Alertas</Link>.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
