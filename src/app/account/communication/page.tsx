"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Mail } from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import SiteFooter from "@/components/Footer";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  EMAIL_INTEREST_LABELS,
} from "@/lib/communication-preferences";

type PreferenceResponse = {
  subscription: {
    id: string | null;
    email: string;
    city: string | null;
    interests: string[];
    updatedAt: string | null;
  } | null;
};

const COMMUNICATION_INTERESTS = ["BUY", "ANNOUNCE"] as const;

const initialState = {
  city: "",
  interests: ["BUY"],
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
          interests:
            Array.isArray(payload.subscription?.interests) && payload.subscription.interests.length
              ? payload.subscription.interests.filter((interest: string) => COMMUNICATION_INTERESTS.includes(interest as (typeof COMMUNICATION_INTERESTS)[number]))
              : ["BUY"],
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
          interests: form.interests,
          frequency: "WEEKLY",
          subscribedToAlerts: true,
          subscribedToDigest: true,
          subscribedToGuides: false,
          subscribedToPriceDrops: false,
          status: "ACTIVE",
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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Newsletter</h1>
          <p className="text-gray-600 mb-8">Entre para salvar seu e-mail e receber novidades semanais do OggaHub.</p>
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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-display">Newsletter</h1>
            <p className="mt-1 text-gray-600">Deixe só o essencial: seu e-mail, cidade de interesse e o que você quer acompanhar.</p>
          </div>
          <Link href="/account">
            <Button variant="secondary">Voltar para conta</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 rounded-[24px] border border-gray-200 bg-gray-50 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">Newsletter</div>
            <div className="mt-2 text-xl font-semibold text-gray-900">Receba novidades semanais do OggaHub</div>
          </div>

          <div className="space-y-4">
            <Input label="E-mail" value={email} disabled className="bg-gray-50" />
            <Input label="Cidade de interesse" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="Ex: Petrolina" />

            <div className="rounded-[24px] border border-gray-200 p-4">
              <div className="mb-3 text-sm font-medium text-gray-900">Temas de maior interesse</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {COMMUNICATION_INTERESTS.map((interest) => (
                  <label key={interest} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 transition-colors hover:border-gray-300 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={form.interests.includes(interest)}
                      onChange={() => toggleInterest(interest)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                    />
                    <span className="text-sm font-medium text-gray-800">{interest === "ANNOUNCE" ? "Vender" : EMAIL_INTEREST_LABELS[interest]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Envio semanal por padrão, sem preferências avançadas.
            </div>
          </div>

          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar newsletter"}</Button>
          </div>
        </form>
      </div>
      <SiteFooter />
    </main>
  );
}
