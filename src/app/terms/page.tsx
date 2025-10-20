"use client";

import { ModernNavbar } from "@/components/modern";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar />
      
      <div className="mt-16 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Termos de Uso</h1>
              <p className="text-gray-600 mt-1">Última atualização: 20 de outubro de 2025</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 prose prose-blue max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Aceitação dos Termos</h2>
            <p className="text-gray-700 leading-relaxed">
              Ao acessar e usar a plataforma ZillowLike, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Se você não concorda com qualquer parte destes termos, não deve usar nossa plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Definições</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Plataforma:</strong> Refere-se ao site e aplicações ZillowLike</li>
              <li><strong>Usuário:</strong> Qualquer pessoa que acesse a plataforma</li>
              <li><strong>Proprietário:</strong> Usuário que anuncia imóveis na plataforma</li>
              <li><strong>Corretor:</strong> Profissional imobiliário com CRECI ativo</li>
              <li><strong>Conteúdo:</strong> Informações, textos, imagens e dados publicados</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Uso da Plataforma</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">3.1. Cadastro e Conta</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Você deve fornecer informações verdadeiras e atualizadas</li>
              <li>É responsável por manter a segurança de sua conta</li>
              <li>Não deve compartilhar suas credenciais de acesso</li>
              <li>Deve ter 18 anos ou mais para criar uma conta</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">3.2. Anúncios de Imóveis</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Proprietários devem ter autorização para anunciar os imóveis</li>
              <li>Todas as informações devem ser verdadeiras e precisas</li>
              <li>Fotos devem corresponder ao imóvel anunciado</li>
              <li>Preços devem ser reais e praticados no mercado</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">3.3. Corretores</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Devem possuir CRECI ativo e regular</li>
              <li>Devem fornecer documentação verdadeira</li>
              <li>Devem seguir o código de ética profissional</li>
              <li>Não podem cobrar taxas não acordadas previamente</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Responsabilidades</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.1. Da Plataforma</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Fornecer uma plataforma funcional e segura</li>
              <li>Proteger dados pessoais conforme LGPD</li>
              <li>Moderar conteúdo inadequado</li>
              <li>Disponibilizar suporte aos usuários</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.2. Dos Usuários</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Usar a plataforma de forma lícita e ética</li>
              <li>Não publicar conteúdo ofensivo ou enganoso</li>
              <li>Respeitar direitos autorais e propriedade intelectual</li>
              <li>Não tentar burlar sistemas de segurança</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Conduta Proibida</h2>
            <p className="text-gray-700 mb-3">É expressamente proibido:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Usar a plataforma para atividades ilegais</li>
              <li>Publicar anúncios falsos ou fraudulentos</li>
              <li>Assediar, ameaçar ou difamar outros usuários</li>
              <li>Enviar spam ou mensagens não solicitadas</li>
              <li>Copiar ou reproduzir conteúdo sem autorização</li>
              <li>Usar bots ou automação não autorizada</li>
              <li>Tentar acessar contas de terceiros</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Propriedade Intelectual</h2>
            <p className="text-gray-700 leading-relaxed">
              Todo o conteúdo da plataforma, incluindo design, código, marca, logos e textos, é de propriedade da ZillowLike ou de seus licenciadores. Você pode usar a plataforma para fins pessoais e não comerciais, mas não pode copiar, modificar ou distribuir nosso conteúdo sem autorização.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Isenção de Responsabilidade</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>A plataforma é fornecida "como está"</li>
              <li>Não garantimos a disponibilidade ininterrupta do serviço</li>
              <li>Não nos responsabilizamos por transações entre usuários</li>
              <li>Não verificamos a autenticidade de todos os imóveis</li>
              <li>Não somos parte em negociações entre usuários</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitação de Responsabilidade</h2>
            <p className="text-gray-700 leading-relaxed">
              A ZillowLike não será responsável por danos diretos, indiretos, incidentais, especiais ou consequenciais resultantes do uso ou impossibilidade de uso da plataforma, incluindo perda de dados, lucros cessantes ou danos à reputação.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Suspensão e Cancelamento</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Podemos suspender ou cancelar sua conta a qualquer momento, sem aviso prévio, se:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Você violar estes termos de uso</li>
              <li>Houver atividade suspeita em sua conta</li>
              <li>Recebermos múltiplas reclamações sobre você</li>
              <li>Por determinação legal ou judicial</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Modificações</h2>
            <p className="text-gray-700 leading-relaxed">
              Reservamos o direito de modificar estes termos a qualquer momento. Alterações significativas serão notificadas por email ou por meio da plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Lei Aplicável</h2>
            <p className="text-gray-700 leading-relaxed">
              Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca de [Cidade], com exclusão de qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contato</h2>
            <p className="text-gray-700 leading-relaxed">
              Para dúvidas sobre estes termos, entre em contato:
            </p>
            <ul className="list-none pl-0 space-y-2 text-gray-700 mt-3">
              <li><strong>Email:</strong> legal@zillowlike.com</li>
              <li><strong>Telefone:</strong> (11) 0000-0000</li>
              <li><strong>Endereço:</strong> [Endereço completo]</li>
            </ul>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Ao usar nossa plataforma, você declara ter lido, compreendido e concordado com estes Termos de Uso.
            </p>
            <div className="flex gap-4 justify-center mt-6">
              <Link 
                href="/privacy" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Política de Privacidade
              </Link>
              <span className="text-gray-400">•</span>
              <Link 
                href="/" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
