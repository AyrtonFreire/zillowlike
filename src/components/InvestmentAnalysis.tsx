"use client";

import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Home, AlertCircle, CheckCircle, Target, Calendar, PiggyBank } from "lucide-react";

interface InvestmentAnalysisProps {
  propertyPrice: number; // em centavos
  propertyType: string;
  areaM2?: number;
  city: string;
  state: string;
  bedrooms?: number;
}

interface InvestmentMetrics {
  purchasePrice: number;
  itbi: number;
  registrationFees: number;
  totalCost: number;
  estimatedRent: number;
  annualReturn: number;
  breakEvenMonths: number;
  investmentScore: number;
  pricePerM2: number;
  marketAverage: number;
  appreciation5Years: number;
}

export default function InvestmentAnalysis({
  propertyPrice,
  propertyType,
  areaM2,
  city,
  state,
  bedrooms = 2,
}: InvestmentAnalysisProps) {
  const [metrics, setMetrics] = useState<InvestmentMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateMetrics();
  }, [propertyPrice, propertyType, areaM2, city]);

  const calculateMetrics = () => {
    const price = propertyPrice / 100;

    // ITBI (Imposto de Transmissão de Bens Imóveis) - varia por cidade, média 2-3%
    const itbi = price * 0.025;

    // Taxas de registro e cartório - média 1.5%
    const registrationFees = price * 0.015;

    // Custo total
    const totalCost = price + itbi + registrationFees;

    // Estimativa de aluguel baseada em regras do mercado
    // Regra geral: aluguel = 0.5% a 0.8% do valor do imóvel
    const rentPercentage = propertyType === "APARTMENT" ? 0.006 : 0.005;
    const estimatedRent = price * rentPercentage;

    // Retorno anual (yield)
    const annualReturn = ((estimatedRent * 12) / totalCost) * 100;

    // Break-even (payback) em meses
    const breakEvenMonths = Math.round(totalCost / estimatedRent);

    // Preço por m² (se disponível)
    const pricePerM2 = areaM2 ? price / areaM2 : 0;

    // Média de mercado por tipo (estimativas brasileiras 2025)
    const marketAverages: Record<string, number> = {
      APARTMENT: 7000,
      HOUSE: 5500,
      CONDO: 8000,
      LAND: 1500,
      COMMERCIAL: 9000,
    };
    const marketAverage = marketAverages[propertyType] || 6000;

    // Estimativa de valorização em 5 anos (baseada em histórico IPCA + ganho real)
    // Média brasileira: 6-8% ao ano
    const appreciationRate = 0.07; // 7% ao ano
    const appreciation5Years = ((Math.pow(1 + appreciationRate, 5) - 1) * 100);

    // Score de investimento (0-100)
    let score = 50; // base

    // Fatores positivos
    if (annualReturn > 5) score += 15;
    if (annualReturn > 6) score += 10;
    if (annualReturn > 7) score += 10;
    if (breakEvenMonths < 180) score += 10; // < 15 anos
    if (breakEvenMonths < 150) score += 5;
    if (pricePerM2 > 0 && pricePerM2 < marketAverage) score += 15; // abaixo da média
    if (bedrooms >= 2) score += 5; // mais fácil de alugar
    if (propertyType === "APARTMENT") score += 5; // mais líquido

    // Fatores negativos
    if (annualReturn < 4) score -= 20;
    if (breakEvenMonths > 200) score -= 15;
    if (pricePerM2 > marketAverage * 1.3) score -= 15; // 30% acima da média

    // Limita score entre 0-100
    score = Math.max(0, Math.min(100, score));

    setMetrics({
      purchasePrice: price,
      itbi,
      registrationFees,
      totalCost,
      estimatedRent,
      annualReturn,
      breakEvenMonths,
      investmentScore: Math.round(score),
      pricePerM2,
      marketAverage,
      appreciation5Years,
    });

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excelente Investimento";
    if (score >= 60) return "Bom Investimento";
    if (score >= 40) return "Investimento Moderado";
    return "Investimento Arriscado";
  };

  if (loading || !metrics) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-600 rounded-lg">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Análise de Investimento
          </h3>
          <p className="text-sm text-gray-600">
            Avaliação financeira completa
          </p>
        </div>
      </div>

      {/* Investment Score - Destaque */}
      <div className={`rounded-xl p-6 border-2 mb-6 ${getScoreColor(metrics.investmentScore)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium opacity-75">Score de Investimento</span>
          <Target className="w-5 h-5" />
        </div>
        <div className="text-4xl font-bold mb-1">
          {metrics.investmentScore}/100
        </div>
        <div className="text-sm font-medium">
          {getScoreLabel(metrics.investmentScore)}
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="space-y-4 mb-6">
        {/* Retorno Anual */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                Retorno Anual (Yield)
              </span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              {metrics.annualReturn.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Aluguel estimado: {formatCurrency(metrics.estimatedRent)}/mês
          </p>
        </div>

        {/* Break-even */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                Payback Period
              </span>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              {Math.floor(metrics.breakEvenMonths / 12)} anos
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {metrics.breakEvenMonths} meses para recuperar investimento
          </p>
        </div>

        {/* Valorização */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                Valorização Estimada (5 anos)
              </span>
            </div>
            <span className="text-2xl font-bold text-blue-600">
              +{metrics.appreciation5Years.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Baseado em média histórica de 7% a.a.
          </p>
        </div>
      </div>

      {/* Custos Detalhados */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Custos de Aquisição
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Valor do imóvel</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(metrics.purchasePrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ITBI (2.5%)</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(metrics.itbi)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Registro e cartório (1.5%)</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(metrics.registrationFees)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="font-semibold text-gray-900">Total a investir</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(metrics.totalCost)}
            </span>
          </div>
        </div>
      </div>

      {/* Comparação de Mercado */}
      {metrics.pricePerM2 > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Home className="w-4 h-4" />
            Preço por m²
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Este imóvel</span>
              <span className="font-bold text-lg text-gray-900">
                {formatCurrency(metrics.pricePerM2)}/m²
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Média do mercado</span>
              <span className="font-medium text-gray-600">
                {formatCurrency(metrics.marketAverage)}/m²
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              {metrics.pricePerM2 < metrics.marketAverage ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {((1 - metrics.pricePerM2 / metrics.marketAverage) * 100).toFixed(1)}% 
                    abaixo da média - Boa oportunidade!
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {((metrics.pricePerM2 / metrics.marketAverage - 1) * 100).toFixed(1)}% 
                    acima da média
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800">
          ℹ️ <strong>Análise Estimada:</strong> Valores calculados com base em médias de mercado e 
          dados históricos. Consulte um corretor ou consultor financeiro para análise personalizada.
        </p>
      </div>
    </div>
  );
}
