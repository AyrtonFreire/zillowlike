"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModernNavbar } from "@/components/modern";
import ExploreCityGate from "./_components/ExploreCityGate";

type Mode = "buy" | "rent";

export default function ExplorePage() {
  const searchParams = useSearchParams();

  const initialMode = useMemo<Mode>(() => {
    const m = String(searchParams?.get("mode") || "").toLowerCase();
    if (m === "rent") return "rent";
    return "buy";
  }, [searchParams]);

  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-sky-50">
      <ModernNavbar forceLight />

      <div className="mx-auto max-w-5xl px-4 pt-20 pb-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-teal-700 uppercase">
            Explorar imóveis
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-display text-slate-900">
            Escolha a cidade e encontre opções em minutos
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Selecione se você quer comprar ou alugar e depois escolha a cidade.
          </p>
        </div>

        <div className="mt-6 inline-flex rounded-2xl bg-white/80 backdrop-blur border border-white/60 shadow-sm p-1">
          <button
            type="button"
            onClick={() => setMode("buy")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === "buy" ? "bg-teal-700 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Comprar
          </button>
          <button
            type="button"
            onClick={() => setMode("rent")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === "rent" ? "bg-teal-700 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Alugar
          </button>
        </div>
      </div>

      <div className="-mt-6">
        <ExploreCityGate mode={mode} />
      </div>
    </div>
  );
}
