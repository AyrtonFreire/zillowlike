"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { calculateAllBanks, BANKS } from "@/lib/financing";
import BankLogo from "@/components/BankLogo";
import type { ApiProperty } from "@/types/api";

export default function FinancingPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params?.propertyId as string;
  
  const [property, setProperty] = useState<ApiProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProperty() {
      if (!propertyId) return;
      
      try {
        const res = await fetch(`/api/properties?id=${propertyId}`);
        if (!res.ok) {
          setError("Imóvel não encontrado");
          return;
        }
        
        const data = await res.json();
        setProperty(data.item);
      } catch (err) {
        setError("Erro ao carregar informações do imóvel");
      } finally {
        setLoading(false);
      }
    }

    loadProperty();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando simulação...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Imóvel não encontrado"}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Voltar à página inicial
          </Link>
        </div>
      </div>
    );
  }

  const propertyValue = property.price / 100;
  const bankCalculations = calculateAllBanks(propertyValue);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
              Voltar
            </button>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Property Image */}
            <div className="w-full lg:w-80 h-48 lg:h-32 relative rounded-lg overflow-hidden bg-gray-200">
              {property.images?.[0]?.url ? (
                <Image 
                  src={property.images[0].url} 
                  alt={property.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Sem foto
                </div>
              )}
            </div>
            
            {/* Property Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{property.title}</h1>
              <p className="text-gray-600 mb-2">
                {property.street}, {property.neighborhood} - {property.city}/{property.state}
              </p>
              <div className="text-3xl font-bold text-green-600">
                {propertyValue.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Simulação de Financiamento
          </h2>
          <p className="text-gray-600 mb-4">
            Compare as condições de financiamento dos principais bancos. 
            Os valores são simulações aproximadas e podem variar conforme análise de crédito.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Importante</p>
                <p className="text-sm text-yellow-700">
                  Esta é uma simulação informativa. Para financiamento real, consulte diretamente o banco escolhido.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Banks Comparison */}
        <div className="grid gap-4">
          {bankCalculations.map(({ bank, calculation }) => (
            <div key={bank.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Bank Info */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <BankLogo bankId={bank.id} size={48} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{bank.name}</h3>
                    <p className="text-sm text-gray-600">Taxa: {bank.interestRate}% a.a.</p>
                  </div>
                </div>

                {/* Calculation Details */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Parcela</p>
                    <p className="font-bold text-lg text-gray-900">
                      {calculation.monthlyPayment.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Entrada</p>
                    <p className="font-bold text-gray-900">
                      {calculation.downPayment.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Prazo</p>
                    <p className="font-bold text-gray-900">{bank.maxTerm} anos</p>
                  </div>
                  <div>
                    <a
                      href={bank.simulatorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 glass-teal hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Simular no banco
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Como funciona o financiamento imobiliário?</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium mb-2">Entrada mínima</h4>
              <p>Geralmente 20% do valor do imóvel, mas pode variar conforme o banco e programa habitacional.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Prazo de pagamento</h4>
              <p>Até 35 anos para quitação, com parcelas mensais fixas ou decrescentes.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Documentação</h4>
              <p>Comprovação de renda, CPF, RG, certidões e documentos do imóvel.</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Análise de crédito</h4>
              <p>O banco avalia seu perfil financeiro para aprovar o financiamento.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
