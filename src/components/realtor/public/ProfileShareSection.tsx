"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

interface ProfileShareSectionProps {
  pageUrl: string;
  onOpenSharePanel: () => void;
}

export default function ProfileShareSection({
  pageUrl,
  onOpenSharePanel,
}: ProfileShareSectionProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(pageUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // ignore
    }
  };

  return (
    <section
      id="share"
      className="scroll-mt-28 border-t border-slate-200 py-10"
      aria-label="Compartilhar perfil"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Distribuição
        </p>
        <h2 className="mt-2 font-serif text-xl text-slate-950 sm:text-2xl">
          Compartilhe seu perfil público
        </h2>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Use este link em redes sociais, assinaturas de e-mail e anúncios para divulgar sua carteira
          mantendo o padrão institucional do OggaHub.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
            <span className="truncate text-slate-700">{pageUrl}</span>
            <button
              type="button"
              onClick={onCopy}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-800 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-100"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenSharePanel}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Share2 className="h-4 w-4" />
            Abrir opções
          </button>
        </div>
      </div>
    </section>
  );
}
