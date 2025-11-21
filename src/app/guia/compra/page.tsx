"use client";

import { ModernNavbar } from "@/components/modern";
import Link from "next/link";
import { Home, ArrowLeft, CheckCircle, AlertCircle, DollarSign, FileText, Key } from "lucide-react";

export default function GuiaCompraPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      
      <div className="mt-16 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/guides" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos guias
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Home className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Guia do Comprador</h1>
              <p className="text-gray-600 mt-1">Tudo o que você precisa saber para comprar seu imóvel</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Passo 1 */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Defina seu Orçamento</h2>
                <p className="text-gray-700 leading-relaxed">
                  Antes de começar a busca, saiba exatamente quanto pode gastar. Considere:
                </p>
              </div>
            </div>
            
            <ul className="ml-16 space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Valor de entrada:</strong> Geralmente 20-30% do valor do imóvel
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Parcelas do financiamento:</strong> Não devem ultrapassar 30% da renda familiar
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Custos extras:</strong> ITBI (2-3%), escritura, registro, reforma
                </span>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                💡 <strong>Dica:</strong> Use nossa <Link href="/calculadora" className="text-blue-600 hover:underline font-medium">calculadora de financiamento</Link> para simular parcelas e juros.
              </p>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-blue-600">2</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Busque o Imóvel Ideal</h2>
                <p className="text-gray-700 leading-relaxed">
                  Defina seus critérios e comece a busca:
                </p>
              </div>
            </div>
            
            <ul className="ml-16 space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Localização:</strong> Proximidade ao trabalho, escolas, transporte
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Tamanho:</strong> Quartos, banheiros, área útil necessária
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Infraestrutura:</strong> Segurança, lazer, estacionamento
                </span>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-900">
                ⚠️ <strong>Atenção:</strong> Visite o imóvel pessoalmente. Fotos podem não mostrar todos os detalhes.
              </p>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-blue-600">3</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Faça Visitas</h2>
                <p className="text-gray-700 leading-relaxed">
                  Durante a visita, fique atento a:
                </p>
              </div>
            </div>
            
            <ul className="ml-16 space-y-3">
              <li className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Estrutura:</strong> Rachaduras, infiltrações, problemas elétricos/hidráulicos
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Iluminação:</strong> Natural, ventilação, orientação solar
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Vizinhança:</strong> Barulho, segurança, comércio próximo
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Documentação:</strong> Peça IPTU, condomínio, certidões
                </span>
              </li>
            </ul>
          </div>

          {/* Passo 4 */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-blue-600">4</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Negocie e Faça Proposta</h2>
                <p className="text-gray-700 leading-relaxed">
                  Estratégias de negociação:
                </p>
              </div>
            </div>
            
            <ul className="ml-16 space-y-3">
              <li className="flex items-start gap-2">
                <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Pesquise o mercado:</strong> Compare preços de imóveis similares na região
                </span>
              </li>
              <li className="flex items-start gap-2">
                <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Seja realista:</strong> Faça ofertas justas, nem muito baixas nem muito altas
                </span>
              </li>
              <li className="flex items-start gap-2">
                <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Formalize por escrito:</strong> Proposta de compra assinada por ambas as partes
                </span>
              </li>
            </ul>
          </div>

          {/* Passo 5 */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-blue-600">5</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicite Financiamento</h2>
                <p className="text-gray-700 leading-relaxed">
                  Documentos geralmente necessários:
                </p>
              </div>
            </div>
            
            <ul className="ml-16 space-y-3">
              <li className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  RG, CPF, comprovante de residência, estado civil
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Comprovantes de renda (últimos 3 meses)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Declaração de IR, extratos bancários
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Matrícula atualizada do imóvel
                </span>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-900">
                ✅ <strong>Dica:</strong> Compare taxas entre diferentes bancos. A diferença pode economizar milhares de reais.
              </p>
            </div>
          </div>

          {/* Passo 6 */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-blue-600">6</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Assine o Contrato</h2>
                <p className="text-gray-700 leading-relaxed">
                  Etapas finais da compra:
                </p>
              </div>
            </div>
            
            <ul className="ml-16 space-y-3">
              <li className="flex items-start gap-2">
                <Key className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Vistoria:</strong> Confira o imóvel antes de assinar
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Key className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Escritura:</strong> Lavrada em cartório, transfere a propriedade
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Key className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>Registro:</strong> Imóvel é registrado em seu nome no cartório de imóveis
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Key className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  <strong>ITBI:</strong> Imposto municipal sobre transmissão (pague antes da escritura)
                </span>
              </li>
            </ul>
          </div>

          {/* Checklist */}
          <div className="bg-gradient-to-br glass-teal rounded-2xl shadow-lg p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Checklist do Comprador</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Orçamento definido</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Financiamento pré-aprovado</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Documentação pronta</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Imóvel vistoriado</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Certidões verificadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Contrato revisado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Links Úteis */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ferramentas Úteis</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link 
                href="/calculadora" 
                className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all"
              >
                <h3 className="font-semibold text-gray-900 mb-1">Calculadora</h3>
                <p className="text-sm text-gray-600">Simule seu financiamento</p>
              </Link>
              <Link 
                href="/?status=SALE" 
                className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all"
              >
                <h3 className="font-semibold text-gray-900 mb-1">Buscar Imóveis</h3>
                <p className="text-sm text-gray-600">Encontre seu novo lar</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
