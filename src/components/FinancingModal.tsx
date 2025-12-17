"use client";

import { useState } from "react";
import Link from "next/link";

export default function FinancingModal({ amountCents }: { amountCents: number }) {
  const [open, setOpen] = useState(false);
  const [entryPct, setEntryPct] = useState(20);
  const [months, setMonths] = useState(360);
  const [rateYear, setRateYear] = useState(10); // % a.a.

  const amount = amountCents / 100;
  const entry = (entryPct / 100) * amount;
  const financed = Math.max(0, amount - entry);
  const i = rateYear / 12 / 100;
  const n = months;
  const installment = i > 0 ? (financed * i) / (1 - Math.pow(1 + i, -n)) : financed / n;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow"
        title="Simular parcelas"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Simular parcelas
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Simulador de financiamento</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-700">
                  Entrada (%)
                  <input type="number" min={0} max={90} value={entryPct} onChange={(e)=> setEntryPct(Number(e.target.value))} className="mt-1 w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" />
                </label>
                <label className="text-sm text-gray-700">
                  Prazo (meses)
                  <input type="number" min={12} max={420} step={12} value={months} onChange={(e)=> setMonths(Number(e.target.value))} className="mt-1 w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" />
                </label>
                <label className="text-sm text-gray-700 col-span-2">
                  Taxa (% a.a.)
                  <input type="number" min={0} max={30} step={0.1} value={rateYear} onChange={(e)=> setRateYear(Number(e.target.value))} className="mt-1 w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" />
                </label>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <div className="text-sm text-gray-600">Valor do imóvel</div>
                <div className="text-lg font-semibold">R$ {amount.toLocaleString("pt-BR")}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">Entrada</div>
                    <div className="font-medium">R$ {entry.toLocaleString("pt-BR")}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Financiado</div>
                    <div className="font-medium">R$ {financed.toLocaleString("pt-BR")}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Parcela aprox.</div>
                    <div className="text-indigo-700 font-semibold">R$ {installment.toLocaleString("pt-BR")}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Prazo</div>
                    <div className="font-medium">{months} meses</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">Simulação estimada. Valores podem variar conforme análise de crédito e condições do banco.</p>
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={()=> setOpen(false)}>Fechar</button>
              <Link href="/financing" className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">Ver bancos</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
