"use client";

import { ModernNavbar } from "@/components/modern";
import SiteFooter from "@/components/Footer";
import { useState } from "react";
import { Calculator, DollarSign, Percent, Calendar, TrendingUp, Info } from "lucide-react";

export default function CalculadoraPage() {
  const [valor, setValor] = useState("300000");
  const [entrada, setEntrada] = useState("60000");
  const [prazo, setPrazo] = useState("360");
  const [juros, setJuros] = useState("9.5");
  const [sistema, setSistema] = useState<"SAC" | "PRICE">("SAC");

  const calcularFinanciamento = () => {
    const valorImovel = parseFloat(valor) || 0;
    const valorEntrada = parseFloat(entrada) || 0;
    const meses = parseInt(prazo) || 1;
    const taxaMensal = parseFloat(juros) / 100 / 12;

    const valorFinanciado = valorImovel - valorEntrada;

    if (sistema === "PRICE") {
      // Sistema PRICE (parcela fixa)
      const parcela = valorFinanciado * (taxaMensal * Math.pow(1 + taxaMensal, meses)) / (Math.pow(1 + taxaMensal, meses) - 1);
      const totalPago = parcela * meses + valorEntrada;
      const totalJuros = totalPago - valorImovel;

      return {
        parcela: parcela,
        totalPago: totalPago,
        totalJuros: totalJuros,
        valorFinanciado: valorFinanciado,
      };
    } else {
      // Sistema SAC (parcela decrescente)
      const amortizacao = valorFinanciado / meses;
      const primeiraParcela = amortizacao + (valorFinanciado * taxaMensal);
      const ultimaParcela = amortizacao + (amortizacao * taxaMensal);
      
      let totalJuros = 0;
      let saldoDevedor = valorFinanciado;
      for (let i = 0; i < meses; i++) {
        const jurosDoMes = saldoDevedor * taxaMensal;
        totalJuros += jurosDoMes;
        saldoDevedor -= amortizacao;
      }

      const totalPago = valorFinanciado + totalJuros + valorEntrada;

      return {
        parcela: primeiraParcela,
        parcelaFinal: ultimaParcela,
        totalPago: totalPago,
        totalJuros: totalJuros,
        valorFinanciado: valorFinanciado,
      };
    }
  };

  const resultado = calcularFinanciamento();
  const percentualEntrada = ((parseFloat(entrada) / parseFloat(valor)) * 100).toFixed(1);

  const entradaPercent = (() => {
    const v = Math.max(1, Number(valor) || 0);
    const e = Math.max(0, Number(entrada) || 0);
    const p = (e / v) * 100;
    return Math.max(0, Math.min(100, p));
  })();

  const jurosPercent = (() => {
    const minJ = 6;
    const maxJ = 15;
    const j = Number(juros) || minJ;
    const p = ((j - minJ) / (maxJ - minJ)) * 100;
    return Math.max(0, Math.min(100, p));
  })();

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <ModernNavbar forceLight />
      
      <div className="mx-auto mt-16 max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-10 text-center sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
            <Calculator className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Calculadora de Financiamento
          </h1>
          <p className="text-base text-gray-600 sm:text-lg">
            Simule o financiamento do seu imóvel e planeje sua compra
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulário */}
          <div className="min-w-0 rounded-2xl bg-white p-5 shadow-lg sm:p-8">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Dados do Financiamento</h2>

            {/* Valor do Imóvel */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor do Imóvel
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="300000"
                />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                R$ {parseFloat(valor || "0").toLocaleString("pt-BR")}
              </p>
            </div>

            {/* Valor da Entrada */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor da Entrada ({percentualEntrada}%)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="60000"
                />
              </div>
              <div className="mt-2 relative w-full py-4">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-neutral-200/90" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-gradient-to-r from-[#009B91] via-[#00736E] to-[#021616] shadow-[0_0_0_1px_rgba(0,155,145,0.25)]"
                  style={{ left: "0%", right: `${100 - entradaPercent}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max={valor}
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  className="zlw-range-overlay absolute inset-x-0 top-1/2 -translate-y-1/2 w-full"
                />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                R$ {parseFloat(entrada || "0").toLocaleString("pt-BR")}
              </p>
            </div>

            {/* Prazo */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prazo (meses)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="360"
                />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[120, 180, 240, 300, 360, 420].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPrazo(m.toString())}
                    className={`min-w-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      prazo === m.toString()
                        ? "glass-teal text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {m / 12} anos
                  </button>
                ))}
              </div>
            </div>

            {/* Taxa de Juros */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taxa de Juros (% ao ano)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={juros}
                  onChange={(e) => setJuros(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="9.5"
                />
              </div>
              <div className="mt-2 relative w-full py-4">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-neutral-200/90" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-gradient-to-r from-[#009B91] via-[#00736E] to-[#021616] shadow-[0_0_0_1px_rgba(0,155,145,0.25)]"
                  style={{ left: "0%", right: `${100 - jurosPercent}%` }}
                />
                <input
                  type="range"
                  min="6"
                  max="15"
                  step="0.1"
                  value={juros}
                  onChange={(e) => setJuros(e.target.value)}
                  className="zlw-range-overlay absolute inset-x-0 top-1/2 -translate-y-1/2 w-full"
                />
              </div>
            </div>

            {/* Sistema de Amortização */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sistema de Amortização
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSistema("SAC")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    sistema === "SAC"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-gray-900">SAC</div>
                  <div className="text-xs text-gray-600 mt-1">Parcela decrescente</div>
                </button>
                <button
                  onClick={() => setSistema("PRICE")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    sistema === "PRICE"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-gray-900">PRICE</div>
                  <div className="text-xs text-gray-600 mt-1">Parcela fixa</div>
                </button>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div className="min-w-0 space-y-6">
            {/* Parcela Mensal */}
            <div className="rounded-2xl bg-gradient-to-br glass-teal p-5 text-white shadow-lg sm:p-8">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5" />
                <h3 className="text-lg font-semibold">
                  {sistema === "SAC" ? "Primeira Parcela" : "Parcela Mensal"}
                </h3>
              </div>
              <div className="mb-2 break-words text-3xl font-bold sm:text-4xl">
                R$ {resultado.parcela.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {sistema === "SAC" && resultado.parcelaFinal && (
                <p className="text-white/80 text-sm">
                  Última parcela: R$ {resultado.parcelaFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Detalhes */}
            <div className="rounded-2xl bg-white p-5 shadow-lg sm:p-8">
              <h3 className="mb-6 text-xl font-bold text-gray-900">Resumo do Financiamento</h3>
              
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-4">
                  <span className="text-gray-600">Valor do Imóvel</span>
                  <span className="text-right font-semibold text-gray-900">
                    R$ {parseFloat(valor).toLocaleString("pt-BR")}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-4">
                  <span className="text-gray-600">Entrada ({percentualEntrada}%)</span>
                  <span className="text-right font-semibold text-gray-900">
                    R$ {parseFloat(entrada).toLocaleString("pt-BR")}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-4">
                  <span className="text-gray-600">Valor Financiado</span>
                  <span className="text-right font-semibold text-gray-900">
                    R$ {resultado.valorFinanciado.toLocaleString("pt-BR")}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-4">
                  <span className="text-gray-600">Total de Juros</span>
                  <span className="text-right font-semibold text-red-600">
                    R$ {resultado.totalJuros.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3 border-b-2 border-gray-300 pb-4">
                  <span className="text-gray-600">Prazo</span>
                  <span className="text-right font-semibold text-gray-900">
                    {prazo} meses ({(parseInt(prazo) / 12).toFixed(1)} anos)
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3 pt-2">
                  <span className="text-lg font-semibold text-gray-900">Total a Pagar</span>
                  <span className="text-right text-lg font-bold text-blue-600">
                    R$ {resultado.totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Informações */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-2">Dicas importantes:</p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• Quanto maior a entrada, menor o valor financiado e os juros</li>
                    <li>• SAC: parcelas decrescem ao longo do tempo</li>
                    <li>• PRICE: parcelas fixas, mais fácil de planejar</li>
                    <li>• Considere seguro e custos adicionais (ITBI, cartório)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
