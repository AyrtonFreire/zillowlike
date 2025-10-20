"use client";

import { ModernNavbar } from "@/components/modern";
import Link from "next/link";
import { TrendingUp, ArrowLeft, Camera, DollarSign, Users, CheckCircle } from "lucide-react";

export default function GuiaVendaPage() {
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
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Guia do Vendedor</h1>
              <p className="text-gray-600 mt-1">Como vender seu imóvel mais rápido</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Passo 1 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-green-600">1</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Precifique Corretamente</h2>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Pesquise o mercado:</strong> Compare imóveis similares na região</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Considere:</strong> Localização, estado, reforma, metragem</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Margem de negociação:</strong> Deixe 5-10% para negociar</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    💡 Preço muito alto = Imóvel parado. Preço muito baixo = Perda de dinheiro.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-green-600">2</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Prepare o Imóvel</h2>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Limpeza profunda:</strong> Casa limpa vende mais rápido</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Pequenos reparos:</strong> Conserte torneiras, portas, pintura</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Organize:</strong> Menos móveis = ambiente mais amplo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Iluminação:</strong> Ambientes claros são mais atrativos</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-green-600">3</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Fotos Profissionais</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Camera className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <strong className="text-gray-900">Por que investir:</strong>
                      <p className="text-gray-700 text-sm mt-1">
                        Imóveis com fotos profissionais recebem até 3x mais visualizações e vendem 50% mais rápido.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">Dicas para boas fotos:</p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Fotografe durante o dia, com luz natural</li>
                      <li>• Mostre todos os cômodos principais</li>
                      <li>• Fotos na horizontal ficam melhores</li>
                      <li>• Destaque diferenciais (vista, varanda, etc)</li>
                      <li>• Use câmera ou celular de boa qualidade</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Passo 4 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-green-600">4</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Anuncie Estrategicamente</h2>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Título atrativo:</strong> Destaque o melhor do imóvel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Descrição completa:</strong> Metragem, quartos, diferenciais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Fotos e vídeos:</strong> Quanto mais, melhor</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Divulgue em várias plataformas:</strong> Máxima exposição</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Passo 5 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-green-600">5</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Receba Visitas</h2>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Prepare o ambiente:</strong></p>
                  <ul className="ml-4 space-y-1 text-sm">
                    <li>✓ Casa limpa e organizada</li>
                    <li>✓ Janelas abertas (luz e ventilação)</li>
                    <li>✓ Sem animais de estimação durante visita</li>
                    <li>✓ Cheiro agradável (café, bolo, aromatizador)</li>
                    <li>✓ Documentação pronta para mostrar</li>
                  </ul>
                  <p className="mt-3"><strong>Durante a visita:</strong></p>
                  <ul className="ml-4 space-y-1 text-sm">
                    <li>✓ Seja simpático e responda dúvidas</li>
                    <li>✓ Destaque os pontos fortes</li>
                    <li>✓ Seja honesto sobre problemas</li>
                    <li>✓ Deixe o interessado explorar livremente</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Dicas de Ouro */}
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">💎 Dicas de Ouro</h2>
            <div className="space-y-3 text-sm">
              <p>🏆 <strong>Primeira impressão:</strong> Os primeiros 15 dias de anúncio são cruciais. Capriche!</p>
              <p>📱 <strong>Responda rápido:</strong> Interessados procuram vários imóveis. Seja ágil nas respostas.</p>
              <p>🤝 <strong>Flexibilidade:</strong> Esteja aberto a negociar. Venda rápida > Preço perfeito.</p>
              <p>📄 <strong>Documentação em dia:</strong> IPTU, matrícula, condomínio. Acelera a venda.</p>
              <p>🎯 <strong>Considere corretor:</strong> Se não tem tempo, um corretor pode valer a pena.</p>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Pronto para Vender?</h2>
            <p className="text-gray-600 mb-6">
              Anuncie seu imóvel gratuitamente e receba propostas de compradores interessados!
            </p>
            <Link 
              href="/owner/new" 
              className="inline-block px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg"
            >
              Anunciar Meu Imóvel Grátis →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
