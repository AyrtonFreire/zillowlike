"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Loader2, Mail } from "lucide-react";
import Input from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { InlineFeedbackBanner, SectionCard, StatusBadge } from "@/app/profile/components/ProfilePrimitives";
import { EMAIL_FREQUENCY_LABELS, EMAIL_INTEREST_LABELS, type EmailFrequency, type EmailInterest } from "@/lib/communication-preferences";

type PreferenceResponse = {
  success?: boolean;
  subscription: {
    id: string | null;
    email: string;
    city: string | null;
    interests: string[];
    frequency?: string | null;
    updatedAt: string | null;
  } | null;
};

const COMMUNICATION_INTERESTS: EmailInterest[] = ["BUY", "RENT", "ANNOUNCE", "INVEST"];
const FREQUENCIES: EmailFrequency[] = ["INSTANT", "DAILY", "WEEKLY"];

export function AccountCommunicationSection({ emailFallback }: { emailFallback?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PreferenceResponse | null>(null);
  const [form, setForm] = useState({
    city: "",
    interests: ["BUY"] as EmailInterest[],
    frequency: "WEEKLY" as EmailFrequency,
  });

  const email = useMemo(() => data?.subscription?.email || emailFallback || "", [data?.subscription?.email, emailFallback]);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/email-subscriptions", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as PreferenceResponse | null;
      if (!response.ok || !payload?.success) {
        setError(payload && "subscription" in payload ? "Não foi possível carregar suas preferências." : "Não foi possível carregar suas preferências.");
        return;
      }
      setData(payload);
      setForm({
        city: payload.subscription?.city || "",
        interests:
          Array.isArray(payload.subscription?.interests) && payload.subscription.interests.length
            ? payload.subscription.interests
                .map((interest) => String(interest || "").trim().toUpperCase())
                .filter((interest): interest is EmailInterest => COMMUNICATION_INTERESTS.includes(interest as EmailInterest))
            : ["BUY"],
        frequency:
          FREQUENCIES.includes(String(payload.subscription?.frequency || "").trim().toUpperCase() as EmailFrequency)
            ? (String(payload.subscription?.frequency || "").trim().toUpperCase() as EmailFrequency)
            : "WEEKLY",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  function toggleInterest(interest: EmailInterest) {
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
          interests: form.interests,
          frequency: form.frequency,
          subscribedToAlerts: true,
          subscribedToDigest: true,
          subscribedToGuides: false,
          subscribedToPriceDrops: false,
          status: "ACTIVE",
        }),
      });

      const payload = (await response.json().catch(() => null)) as PreferenceResponse | null;
      if (!response.ok || !payload?.success) {
        setError("Não foi possível salvar suas preferências.");
        return;
      }

      setData(payload);
      setMessage("Preferências atualizadas com sucesso.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      eyebrow="Comunicação"
      title="Alertas e newsletter"
      description="Deixe só o essencial: o que você quer receber e com qual frequência."
      actions={
        <StatusBadge
          tone={form.frequency === "INSTANT" ? "info" : form.frequency === "DAILY" ? "success" : "neutral"}
          label={`Envio ${EMAIL_FREQUENCY_LABELS[form.frequency]}`}
        />
      }
    >
      {error ? <InlineFeedbackBanner tone="error" title="Falha ao carregar comunicação" message={error} /> : null}
      {message ? <InlineFeedbackBanner tone="success" title="Comunicação atualizada" message={message} /> : null}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-neutral-500">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm shadow-black/5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-950">Destino principal</div>
                  <p className="mt-1 text-sm text-neutral-600">Seu e-mail principal recebe notificações e conteúdos selecionados abaixo.</p>
                </div>
              </div>
              <div className="mt-4">
                <Input label="E-mail" value={email} disabled className="bg-neutral-50" />
              </div>
            </div>

            <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm shadow-black/5">
              <div className="text-sm font-semibold text-neutral-950">Temas de interesse</div>
              <p className="mt-1 text-sm text-neutral-600">Escolha o que realmente faz sentido para você acompanhar.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {COMMUNICATION_INTERESTS.map((interest) => {
                  const active = form.interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        active ? "border-teal-200 bg-teal-50 text-teal-950" : "border-neutral-200 bg-neutral-50/70 text-neutral-700 hover:border-neutral-300 hover:bg-white"
                      }`}
                    >
                      <div className={`h-4 w-4 rounded-full border ${active ? "border-teal-600 bg-teal-600" : "border-neutral-300 bg-white"}`} />
                      <span className="text-sm font-medium">{EMAIL_INTEREST_LABELS[interest]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm shadow-black/5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-950">Cadência</div>
                  <p className="mt-1 text-sm text-neutral-600">Defina a velocidade ideal para receber novidades.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {FREQUENCIES.map((frequency) => {
                  const active = form.frequency === frequency;
                  return (
                    <button
                      key={frequency}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, frequency }))}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        active ? "border-teal-200 bg-teal-50" : "border-neutral-200 bg-neutral-50/70 hover:border-neutral-300 hover:bg-white"
                      }`}
                    >
                      <div className="text-sm font-semibold text-neutral-900">{EMAIL_FREQUENCY_LABELS[frequency]}</div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {frequency === "INSTANT"
                          ? "Ideal para quem quer agir rápido assim que algo acontece."
                          : frequency === "DAILY"
                            ? "Bom equilíbrio entre rapidez e foco."
                            : "Receba um resumo compacto por semana."}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm shadow-black/5">
              <Input
                label="Cidade de interesse"
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                placeholder="Ex: Petrolina"
              />
              <p className="mt-3 text-sm text-neutral-600">Use a cidade para deixar os conteúdos mais próximos da sua realidade.</p>
              <div className="mt-5 flex justify-end">
                <Button type="submit" disabled={saving} leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
                  {saving ? "Salvando..." : "Salvar preferências"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </SectionCard>
  );
}
