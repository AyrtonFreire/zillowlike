"use client";

import { MessageCircle, Phone } from "lucide-react";

interface ProfileQuickContactCardProps {
  realtorName: string;
  whatsappAction?: () => void;
  telHref?: string | null;
}

export default function ProfileQuickContactCard({
  realtorName,
  whatsappAction,
  telHref,
}: ProfileQuickContactCardProps) {
  if (!whatsappAction && !telHref) return null;

  const firstName = realtorName.split(" ")[0] || realtorName;

  return (
    <section
      aria-label="Fale com este perfil"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Fale agora
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Resposta direta com {firstName}, sem intermediação.
      </p>

      <div className="mt-4 space-y-2">
        {whatsappAction ? (
          <button
            type="button"
            onClick={whatsappAction}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
          >
            <MessageCircle className="h-4 w-4" />
            Falar no WhatsApp
          </button>
        ) : null}

        {telHref ? (
          <a
            href={`tel:${telHref}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            <Phone className="h-4 w-4" />
            Ligar agora
          </a>
        ) : null}
      </div>
    </section>
  );
}
