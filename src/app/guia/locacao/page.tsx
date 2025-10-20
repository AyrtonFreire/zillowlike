"use client";

import { ModernNavbar } from "@/components/modern";
import Link from "next/link";
import { Key, ArrowLeft, CheckCircle, AlertCircle, FileText, Shield } from "lucide-react";

export default function GuiaLocacaoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar />
      
      <div className="mt-16 max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/guides" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos guias
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Key className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Guia do Inquilino</h1>
              <p className="text-gray-600 mt-1">Como alugar seu imóvel com segurança</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Passo 1 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-purple-600">1</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Defina seu Orçamento</h2>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Aluguel não deve ultrapassar 30% da renda familiar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Considere condomínio, IPTU, água, luz, gás</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Reserve dinheiro para caução e primeiro aluguel</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-purple-600">2</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Documentação Necessária</h2>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>RG, CPF, comprovante de residência</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Comprovantes de renda (3 últimos meses)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Referências pessoais e comerciais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Documentos do fiador (se necessário)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-purple-600">3</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Tipos de Garantia</h2>
                <div className="space-y-3 text-gray-700">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <strong>Fiador:</strong> Pessoa que garante o pagamento. Precisa ter imóvel próprio.
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <strong>Caução:</strong> Depósito de 3 meses de aluguel, devolvido no fim do contrato.
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <strong>Seguro Fiança:</strong> Paga-se mensalmente, sem necessidade de fiador.
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <strong>Título de Capitalização:</strong> Investimento que serve como garantia.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 4 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-purple-600">4</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Vistoria e Contrato</h2>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Vistoria de entrada:</strong> Documente TUDO com fotos e vídeos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Leia o contrato:</strong> Atenção aos reajustes e cláusulas de multa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Prazo:</strong> Mínimo 30 meses para contratos residenciais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Benfeitorias:</strong> Combine antes quem paga reformas e melhorias</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Direitos e Deveres */}
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-lg p-8 text-white">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Seus Direitos e Deveres
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">✅ Direitos:</h3>
                <ul className="space-y-1 text-sm text-white/90">
                  <li>• Usar o imóvel para moradia</li>
                  <li>• Renovar contrato após 30 meses</li>
                  <li>• Receber recibos de pagamento</li>
                  <li>• Imóvel em condições de habitação</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">📋 Deveres:</h3>
                <ul className="space-y-1 text-sm text-white/90">
                  <li>• Pagar aluguel em dia</li>
                  <li>• Conservar o imóvel</li>
                  <li>• Avisar problemas ao proprietário</li>
                  <li>• Devolver nas mesmas condições</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Encontre seu Imóvel</h2>
            <Link 
              href="/?status=RENT" 
              className="block p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-center font-semibold transition-colors"
            >
              Buscar Imóveis para Alugar →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
