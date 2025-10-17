"use client";

import TopNavMega from "@/components/TopNavMega";
import SiteFooter from "@/components/Footer";
import Link from "next/link";
import { Calculator, Home, TrendingUp, FileText, CheckCircle } from "lucide-react";

export default function FinancingPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <TopNavMega />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="text-center">
            <Calculator className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Financiamento Imobiliário
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Realize o sonho da casa própria com as melhores condições do mercado
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Como Funciona */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Como Funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                1. Escolha o Imóvel
              </h3>
              <p className="text-gray-600">
                Navegue pelos nossos imóveis e encontre o ideal para você
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Calculator className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                2. Simule o Financiamento
              </h3>
              <p className="text-gray-600">
                Veja quanto ficaria a parcela mensal e as condições
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                3. Aprove seu Crédito
              </h3>
              <p className="text-gray-600">
                Envie a documentação e aguarde a aprovação do banco
              </p>
            </div>
          </div>
        </div>

        {/* Vantagens */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Vantagens do Financiamento
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <TrendingUp className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Taxas Competitivas
                  </h3>
                  <p className="text-gray-600 text-sm">
                    As melhores taxas do mercado, a partir de 8% ao ano
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <FileText className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Processo Simplificado
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Documentação mínima e aprovação rápida
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Home className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Até 30 Anos para Pagar
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Parcelas que cabem no seu bolso
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Use seu FGTS
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Utilize seu FGTS para entrada ou amortização
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para Começar?
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Encontre o imóvel dos seus sonhos e simule o financiamento em poucos cliques
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
          >
            <Home className="w-5 h-5" />
            Ver Imóveis Disponíveis
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
