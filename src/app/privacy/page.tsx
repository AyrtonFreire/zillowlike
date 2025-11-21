"use client";

import { ModernNavbar } from "@/components/modern";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      
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
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Política de Privacidade</h1>
              <p className="text-gray-600 mt-1">Última atualização: 20 de outubro de 2025</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 prose prose-blue max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introdução</h2>
            <p className="text-gray-700 leading-relaxed">
              A ZillowLike respeita a privacidade de seus usuários e está comprometida em proteger seus dados pessoais. Esta Política de Privacidade explica como coletamos, usamos, compartilhamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Dados Coletados</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.1. Dados fornecidos por você</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Cadastro:</strong> nome, email, telefone, CPF</li>
              <li><strong>Corretores:</strong> CRECI, documentos, especialidades</li>
              <li><strong>Proprietários:</strong> dados dos imóveis, fotos, documentos</li>
              <li><strong>Comunicação:</strong> mensagens, avaliações, comentários</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.2. Dados coletados automaticamente</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Navegação:</strong> páginas visitadas, tempo de permanência</li>
              <li><strong>Dispositivo:</strong> IP, navegador, sistema operacional</li>
              <li><strong>Localização:</strong> geolocalização aproximada (com consentimento)</li>
              <li><strong>Cookies:</strong> preferências, sessões, análises</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Como Usamos seus Dados</h2>
            <p className="text-gray-700 mb-3">Utilizamos seus dados pessoais para:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Prestação de serviços:</strong> criar conta, publicar anúncios, conectar usuários</li>
              <li><strong>Comunicação:</strong> enviar notificações, leads, atualizações</li>
              <li><strong>Melhorias:</strong> análise de uso, desenvolvimento de funcionalidades</li>
              <li><strong>Segurança:</strong> prevenir fraudes, identificar abusos</li>
              <li><strong>Marketing:</strong> enviar ofertas relevantes (com consentimento)</li>
              <li><strong>Cumprimento legal:</strong> atender requisitos legais e regulatórios</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Base Legal (LGPD)</h2>
            <p className="text-gray-700 mb-3">Processamos seus dados com base em:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Consentimento:</strong> quando você concorda explicitamente</li>
              <li><strong>Execução de contrato:</strong> para fornecer nossos serviços</li>
              <li><strong>Obrigação legal:</strong> quando exigido por lei</li>
              <li><strong>Legítimo interesse:</strong> para melhorias e segurança</li>
              <li><strong>Exercício de direitos:</strong> defesa em processos judiciais</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Compartilhamento de Dados</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">5.1. Com quem compartilhamos</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Entre usuários:</strong> leads compartilham dados com proprietários/corretores</li>
              <li><strong>Prestadores de serviço:</strong> hospedagem, email, pagamentos (processadores)</li>
              <li><strong>Autoridades:</strong> quando exigido por lei ou ordem judicial</li>
              <li><strong>Parceiros:</strong> com seu consentimento explícito</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">5.2. O que NÃO fazemos</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>❌ Não vendemos seus dados pessoais</li>
              <li>❌ Não compartilhamos dados para publicidade de terceiros</li>
              <li>❌ Não enviamos spam ou mensagens não autorizadas</li>
              <li>❌ Não transferimos dados para fora do Brasil sem proteção adequada</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies e Tecnologias Similares</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Usamos cookies e tecnologias similares para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Essenciais:</strong> funcionamento básico da plataforma</li>
              <li><strong>Funcionais:</strong> lembrar preferências e configurações</li>
              <li><strong>Analíticos:</strong> entender como você usa a plataforma</li>
              <li><strong>Marketing:</strong> personalizar anúncios (com consentimento)</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Você pode gerenciar cookies nas configurações do seu navegador, mas isso pode afetar a funcionalidade da plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Segurança dos Dados</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Implementamos medidas técnicas e organizacionais para proteger seus dados:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Criptografia SSL/TLS em todas as transmissões</li>
              <li>Armazenamento seguro em servidores protegidos</li>
              <li>Controle de acesso baseado em função</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Backup regular de dados</li>
              <li>Testes de segurança periódicos</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Apesar de nossos esforços, nenhum sistema é 100% seguro. Se detectar atividade suspeita, entre em contato imediatamente.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Seus Direitos (LGPD)</h2>
            <p className="text-gray-700 mb-3">Você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Confirmação:</strong> saber se processamos seus dados</li>
              <li><strong>Acesso:</strong> solicitar cópia dos seus dados</li>
              <li><strong>Correção:</strong> atualizar dados incompletos ou incorretos</li>
              <li><strong>Anonimização:</strong> tornar dados irreversíveis</li>
              <li><strong>Bloqueio:</strong> suspender temporariamente o processamento</li>
              <li><strong>Eliminação:</strong> excluir dados desnecessários</li>
              <li><strong>Portabilidade:</strong> receber dados em formato estruturado</li>
              <li><strong>Revogação:</strong> retirar consentimento a qualquer momento</li>
              <li><strong>Informação:</strong> saber com quem compartilhamos seus dados</li>
              <li><strong>Oposição:</strong> opor-se ao processamento em certas situações</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Para exercer seus direitos, entre em contato através do email: <strong>privacidade@zillowlike.com</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Retenção de Dados</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Mantemos seus dados pelo tempo necessário para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Conta ativa:</strong> enquanto você usar a plataforma</li>
              <li><strong>Obrigações legais:</strong> conforme exigido por lei (geralmente 5 anos)</li>
              <li><strong>Defesa jurídica:</strong> até resolução de disputas</li>
              <li><strong>Dados anonimizados:</strong> indefinidamente para estatísticas</li>
            </ul>
            <p className="text-gray-700 mt-3">
              Após estes períodos, os dados são excluídos de forma segura e irreversível.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Menores de Idade</h2>
            <p className="text-gray-700 leading-relaxed">
              Nossa plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de menores. Se tomarmos conhecimento de que coletamos dados de um menor sem consentimento dos pais, excluiremos tais informações imediatamente.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Transferência Internacional</h2>
            <p className="text-gray-700 leading-relaxed">
              Seus dados são armazenados em servidores localizados no Brasil. Se houver necessidade de transferência internacional, garantiremos proteção adequada através de cláusulas contratuais padrão ou outros mecanismos aprovados pela ANPD.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Alterações nesta Política</h2>
            <p className="text-gray-700 leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Alterações significativas serão notificadas por email ou aviso na plataforma. A data da última atualização está indicada no topo desta página.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Encarregado de Dados (DPO)</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Nosso Encarregado de Proteção de Dados está disponível para esclarecer dúvidas:
            </p>
            <ul className="list-none pl-0 space-y-2 text-gray-700">
              <li><strong>Nome:</strong> [Nome do DPO]</li>
              <li><strong>Email:</strong> dpo@zillowlike.com</li>
              <li><strong>Endereço:</strong> [Endereço completo]</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Autoridade Nacional (ANPD)</h2>
            <p className="text-gray-700 leading-relaxed">
              Se você não estiver satisfeito com nossas práticas de privacidade, pode registrar uma reclamação junto à Autoridade Nacional de Proteção de Dados (ANPD):
            </p>
            <ul className="list-none pl-0 space-y-2 text-gray-700 mt-3">
              <li><strong>Site:</strong> www.gov.br/anpd</li>
              <li><strong>Email:</strong> comunicacao@anpd.gov.br</li>
            </ul>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Estamos comprometidos em proteger sua privacidade e seus dados pessoais.
            </p>
            <div className="flex gap-4 justify-center mt-6">
              <Link 
                href="/terms" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Termos de Uso
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
