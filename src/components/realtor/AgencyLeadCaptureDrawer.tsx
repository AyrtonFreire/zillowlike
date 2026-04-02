"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Script from "next/script";
import Drawer from "@/components/ui/Drawer";
import { useToast } from "@/contexts/ToastContext";

type AgencyLeadCaptureDrawerProps = {
  open: boolean;
  onClose: () => void;
  agencySlug: string | null;
  agencyName: string;
  intent: "BUY" | "RENT" | "LIST" | null;
  whatsappHref?: string | null;
};

type SubmitState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

const EMPTY_STATE: SubmitState = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

function getIntentLabel(intent: "BUY" | "RENT" | "LIST" | null) {
  if (intent === "BUY") return "compra";
  if (intent === "RENT") return "locação";
  if (intent === "LIST") return "captação";
  return "atendimento";
}

function getIntentTitle(intent: "BUY" | "RENT" | "LIST" | null) {
  if (intent === "BUY") return "Quero comprar com apoio da agência";
  if (intent === "RENT") return "Quero encontrar um aluguel";
  if (intent === "LIST") return "Quero anunciar meu imóvel";
  return "Falar com a agência";
}

function getIntentPlaceholder(intent: "BUY" | "RENT" | "LIST" | null) {
  if (intent === "BUY") return "Conte faixa de valor, bairros e tipo de imóvel que procura.";
  if (intent === "RENT") return "Conte região, orçamento e prazo para locação.";
  if (intent === "LIST") return "Conte o tipo de imóvel, cidade/bairro e objetivo da divulgação.";
  return "Conte brevemente como a agência pode te ajudar.";
}

export default function AgencyLeadCaptureDrawer({
  open,
  onClose,
  agencySlug,
  agencyName,
  intent,
  whatsappHref,
}: AgencyLeadCaptureDrawerProps) {
  const toast = useToast();
  const [form, setForm] = useState<SubmitState>({ ...EMPTY_STATE });
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  useEffect(() => {
    if (!open) {
      setForm({ ...EMPTY_STATE });
      setSubmitting(false);
      setTurnstileToken("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !siteKey || typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      const turnstile = (window as any)?.turnstile;
      const container = document.getElementById("agency-public-turnstile");
      if (!turnstile || !container || container.childElementCount > 0) return;
      turnstile.render(container, {
        sitekey: siteKey,
        callback: (token: string) => setTurnstileToken(String(token || "")),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, siteKey]);

  const title = useMemo(() => getIntentTitle(intent), [intent]);
  const helper = useMemo(() => getIntentLabel(intent), [intent]);
  const placeholder = useMemo(() => getIntentPlaceholder(intent), [intent]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agencySlug || !intent) {
      toast.error("Canal indisponível", "Não conseguimos identificar esta agência agora.");
      return;
    }

    const payload = {
      intent,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      message: form.message.trim() || null,
      turnstileToken: turnstileToken || undefined,
    };

    if (payload.name.length < 2) {
      toast.error("Informe seu nome", "Use pelo menos 2 caracteres.");
      return;
    }

    if (!payload.email && !payload.phone) {
      toast.error("Informe um contato", "Preencha e-mail ou telefone para retorno.");
      return;
    }

    if (siteKey && !turnstileToken) {
      toast.error("Confirme a verificação", "Antes de enviar, conclua a validação de segurança.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/public/agencies/${encodeURIComponent(agencySlug)}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos registrar seu contato agora.");
      }

      toast.success("Contato enviado", `Seu pedido de ${helper} foi encaminhado para ${agencyName}.`);
      onClose();
    } catch (err: any) {
      toast.error("Não foi possível enviar", err?.message || "Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={title} contentClassName="p-0 overflow-y-auto flex-1 min-h-0">
      {siteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /> : null}
      <div className="p-5 sm:p-6">
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-4 py-4">
          <div className="text-sm font-semibold text-neutral-900">Atendimento institucional</div>
          <div className="mt-1 text-sm text-neutral-600">
            Seu contato entra no operacional da agência para retorno com contexto de {helper}.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="Seu nome"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="voce@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Telefone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Como podemos ajudar?</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              rows={5}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder={placeholder}
            />
          </div>

          {siteKey ? <div id="agency-public-turnstile" className="overflow-hidden rounded-2xl" /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Enviar para a agência"}
            </button>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Abrir WhatsApp direto
              </a>
            ) : (
              <div className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-500">
                WhatsApp indisponível
              </div>
            )}
          </div>
        </form>
      </div>
    </Drawer>
  );
}
