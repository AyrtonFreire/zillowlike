"use client";

import { useState, useEffect } from "react";
import { Calculator, DollarSign, Calendar, TrendingUp, Download } from "lucide-react";

interface FinancingCalculatorProps {
  propertyPrice?: number;
}

export default function FinancingCalculator({ propertyPrice = 0 }: FinancingCalculatorProps) {
  const [price, setPrice] = useState(propertyPrice);
  const [downPayment, setDownPayment] = useState(propertyPrice * 0.2); // 20% default
  const [years, setYears] = useState(30);
  const [interestRate, setInterestRate] = useState(10.5); // % ao ano

  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);

  useEffect(() => {
    calculateFinancing();
  }, [price, downPayment, years, interestRate]);

  const calculateFinancing = () => {
    const loanAmount = price - downPayment;
    if (loanAmount <= 0 || years <= 0 || interestRate <= 0) {
      setMonthlyPayment(0);
      setTotalPayment(0);
      setTotalInterest(0);
      return;
    }

    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = years * 12;

    // Fórmula Price (Sistema Francês de Amortização)
    const monthly =
      loanAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    const total = monthly * numberOfPayments;
    const interest = total - loanAmount;

    setMonthlyPayment(monthly);
    setTotalPayment(total + downPayment);
    setTotalInterest(interest);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const downPaymentPercent = price > 0 ? (downPayment / price) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 glass-teal rounded-lg">
          <Calculator className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Simulador de Financiamento
          </h3>
          <p className="text-sm text-gray-600">
            Sistema Price (SAC disponível em breve)
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Inputs */}
        <div className="bg-white rounded-xl p-6 space-y-4">
          {/* Property Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor do Imóvel
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="450000"
              />
            </div>
          </div>

          {/* Down Payment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Entrada
              </label>
              <span className="text-sm text-blue-600 font-semibold">
                {downPaymentPercent.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={price}
              step={price / 100}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="mt-2 text-center">
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(downPayment)}
              </span>
            </div>
          </div>

          {/* Years */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Prazo (anos)
              </label>
              <span className="text-sm text-blue-600 font-semibold">
                {years} anos
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="35"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Interest Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Taxa de Juros (ao ano)
              </label>
              <span className="text-sm text-blue-600 font-semibold">
                {interestRate.toFixed(2)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="20"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {/* Monthly Payment - Highlighted */}
          <div className="glass-teal rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">
                Parcela Mensal
              </span>
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(monthlyPayment)}
            </div>
            <p className="text-sm opacity-75 mt-1">
              {years * 12} parcelas fixas
            </p>
          </div>

          {/* Other Results */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">
                  Total a Pagar
                </span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(totalPayment)}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">
                  Total de Juros
                </span>
              </div>
              <div className="text-lg font-bold text-orange-600">
                {formatCurrency(totalInterest)}
              </div>
            </div>
          </div>

          {/* Financed Amount */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Valor Financiado
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(price - downPayment)}
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-xs text-yellow-800">
            ⚠️ <strong>Simulação:</strong> Valores aproximados para referência.
            Consulte instituições financeiras para condições reais de financiamento.
          </p>
        </div>
      </div>
    </div>
  );
}
