"use client";

import { useState } from "react";
import { MessageCircle, Search } from "lucide-react";

interface PortfolioEmptyProps {
  realtorName: string;
  whatsappHref: ((message: string) => string | null) | null;
  defaultIntent?: "BUY" | "RENT";
}

export default function PortfolioEmpty({
  realtorName,
  whatsappHref,
  defaultIntent = "BUY",
}: PortfolioEmptyProps) {
  const [intent, setIntent] = useState<"BUY" | "RENT">(defaultIntent);
  const [region, setRegion] = useState("");
  const [budget, setBudget] = useState("");

  const firstName = realtorName.split(" ")[0] || realtorName;
  const intentLabel = intent === "RENT" ? "alugar" : "comprar";

  const onSend = () => {
    const lines = [
      `Olá ${firstName}, vim do seu perfil público no OggaHub.`,
      `Quero ${intentLabel} um imóvel.`,
      region ? `Região de interesse: ${region}.` : null,
      budget ? `Faixa de orçamento: ${budget}.` : null,
      `Pode me ajudar?`,
    ].filter(Boolean);
    const message = lines.join("\n");
    const href = whatsappHref?.(message);
    if (href && typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const canSend = Boolean(whatsappHref);

  return (
    <section id="grid" className="scroll-mt-28 py-12">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm sm:p-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Atendimento sob demanda
        </p>
        <h2 className="mt-3 font-serif text-2xl text-slate-950 sm:text-3xl">
          {firstName} trabalha com captação personalizada
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-700">
          Conte o que você procura e {firstName} já busca opções alinhadas ao seu perfil, antes mesmo
          de publicar no OggaHub.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Intenção</label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setIntent("BUY")}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                  intent === "BUY"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                }`}
              >
                Comprar
              </button>
              <button
                type="button"
                onClick={() => setIntent("RENT")}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                  intent === "RENT"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                }`}
              >
                Alugar
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600" htmlFor="portfolioEmptyRegion">
              Região
            </label>
            <input
              id="portfolioEmptyRegion"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Ex: Centro, Petrolina"
              className="mt-1 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600" htmlFor="portfolioEmptyBudget">
              Faixa
            </label>
            <input
              id="portfolioEmptyBudget"
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Ex: até R$ 450 mil"
              className="mt-1 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canSend}
            onClick={onSend}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            <MessageCircle className="h-4 w-4" />
            Enviar pedido pelo WhatsApp
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Search className="h-3.5 w-3.5" />
            Sem catálogo público no momento — atendimento individualizado.
          </span>
        </div>
      </div>
    </section>
  );
}
