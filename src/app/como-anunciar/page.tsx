"use client";

import { ModernNavbar } from "@/components/modern";
import Link from "next/link";
import { Home, Briefcase, ArrowRightCircle, Sparkles, CheckCircle2, Users, ShieldCheck, ArrowLeft } from "lucide-react";

export default function ComoAnunciarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />

      {/* Hero */}
      <div className="mt-16 bg-gradient-to-br from-teal-dark via-teal to-accent text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 lg:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-[0.16em] mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Como anunciar no ZillowLike</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              Anuncie seus imóveis com uma experiência pensada para pessoas físicas e corretores.
            </h1>
            <p className="text-sm sm:text-base text-teal-50/95 mb-6 max-w-xl">
              Nosso modelo conecta proprietários, compradores e corretores em um único fluxo, com foco em transparência, organização de leads e facilidade para publicar anúncios de alta qualidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/owner/new"
                className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold bg-white text-teal-700 shadow-md hover:shadow-lg hover:bg-teal-50 transition-all"
              >
                <Home className="w-4 h-4 mr-2" />
                Sou pessoa física e quero anunciar
              </Link>
              <Link
                href="/realtor/register"
                className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold border border-white/70 text-white/95 hover:bg-white/10 transition-all"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Sou corretor(a) e quero atuar no site
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex justify-end">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 w-full max-w-md shadow-[0_24px_60px_rgba(15,23,42,0.55)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-100 mb-3">
                Visão geral do fluxo
              </p>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-6 w-0.5 rounded-full bg-accent/70" />
                  <div>
                    <p className="font-semibold">1. Cadastro rápido do perfil</p>
                    <p className="text-teal-50/90">Defina se é proprietário(a) ou corretor(a) para que o site personalize a experiência.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-6 w-0.5 rounded-full bg-accent/70" />
                  <div>
                    <p className="font-semibold">2. Criação guiada do anúncio</p>
                    <p className="text-teal-50/90">Formulários passo a passo ajudam você a preencher todos os dados importantes do imóvel.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-6 w-0.5 rounded-full bg-accent/70" />
                  <div>
                    <p className="font-semibold">3. Distribuição inteligente dos leads</p>
                    <p className="text-teal-50/90">Compradores interessados são organizados em filas e funis, facilitando o acompanhamento.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-6xl mx-auto px-4 py-10 lg:py-16 space-y-12">
        {/* Seção PF x Corretor */}
        <section className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-7 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal/5 flex items-center justify-center">
                <Home className="w-5 h-5 text-teal" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sou pessoa física (proprietário)</h2>
                <p className="text-sm text-gray-600">Ideal para quem quer anunciar seu próprio imóvel com autonomia.</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal mt-0.5" />
                <span>Crie anúncios completos com fotos, planta, comodidades e detalhes que valorizam o seu imóvel.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal mt-0.5" />
                <span>Receba contatos de interessados diretamente pelo site, com histórico organizado por imóvel.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal mt-0.5" />
                <span>Tenha visibilidade em uma vitrine moderna, com filtros avançados que conectam o seu anúncio ao público certo.</span>
              </li>
            </ul>
            <div className="mt-6 flex justify-between items-center text-sm">
              <p className="text-gray-500">Você controla o anúncio: pode pausar, editar ou remover quando quiser.</p>
              <Link
                href="/owner/new"
                className="inline-flex items-center text-teal font-semibold hover:text-teal-dark"
              >
                Começar agora
                <ArrowRightCircle className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-7 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sou corretor(a) de imóveis</h2>
                <p className="text-sm text-gray-600">Perfeito para quem quer organizar leads e escalar o atendimento.</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5" />
                <span>Receba leads qualificados de anúncios do site, incluindo imóveis publicados por pessoas físicas.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5" />
                <span>Use dashboards e filas inteligentes para organizar visitas, retornos e negociações.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5" />
                <span>Construa reputação atendendo bem leads indicados pelo site e fechando mais negócios.</span>
              </li>
            </ul>
            <div className="mt-6 flex justify-between items-center text-sm">
              <p className="text-gray-500">Sua atuação é integrada ao funil do ZillowLike, sem perder o controle da sua carteira.</p>
              <Link
                href="/realtor/register"
                className="inline-flex items-center text-indigo-700 font-semibold hover:text-indigo-800"
              >
                Fazer meu cadastro rápido como corretor(a)
                <ArrowRightCircle className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* Diferenciais do modelo de negócio */}
        <section className="bg-white rounded-2xl shadow-lg p-7 border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Diferenciais do ZillowLike</h2>
              <p className="text-sm text-gray-600">Não somos apenas um classificado de imóveis. Nosso foco é fluxo, organização e experiência.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-700">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Conexão PF + Corretor
              </h3>
              <p>
                Proprietários podem anunciar direto no site, e caso opte, corretores entram no fluxo para ajudar a conduzir visitas, propostas e fechamento de forma profissional.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                Leads organizados e rastreáveis
              </h3>
              <p>
                Interessados são registrados com data, origem e imóvel de interesse, facilitando acompanhamento, retorno e histórico de conversas.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Experiência inspirada em grandes portais
              </h3>
              <p>
                Interface moderna, ituitiva e adaptada à realidade do mercado local e às necessidades de Pessoas Físicas e Corretores.
              </p>
            </div>
          </div>
        </section>

        {/* Passo a passo resumido */}
        <section className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600 mb-2">Passo 1</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Crie sua conta e defina o perfil</h3>
            <p className="text-sm text-gray-700 mb-4 flex-1">
              Acesse o site, crie seu login, cadastre e valide seu telefone para contato via SMS em Meu Perfil e informe se é corretor(a) ou pessoa física. Ao anunciar um imóvel grátis como pessoa física, seu perfil é atualizado automaticamente para Proprietário(a), desbloqueando os fluxos corretos para cada tipo de usuário.
            </p>
            <Link href="/become-realtor" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800">
              Ver fluxo completo para corretores parceiros
              <ArrowRightCircle className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600 mb-2">Passo 2</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Cadastre o imóvel com riqueza de detalhes</h3>
            <p className="text-sm text-gray-700 mb-4 flex-1">
              Informe localização, características, comodidades, fotos de qualidade e diferenciais do imóvel. Ao final, você revisa o anúncio e confirma o telefone de contato usado nas ligações e mensagens. Se precisar ajustar ou validar o número, pode abrir Meu Perfil em outra aba sem perder o que já preencheu.
            </p>
            <Link href="/owner/new" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800">
              Cadastrar meu primeiro anúncio
              <ArrowRightCircle className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600 mb-2">Passo 3</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Acompanhe leads e negociações</h3>
            <p className="text-sm text-gray-700 mb-4 flex-1">
              Use os painéis do site para acompanhar quem entrou em contato, marcar visitas e registrar o andamento das propostas.
            </p>
            <Link href="/owner/dashboard" className="inline-flex items-center text-sm font-semibold text-teal-700 hover:text-teal-800">
              Ver painel do proprietário
              <ArrowRightCircle className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-gradient-to-br glass-teal rounded-2xl shadow-xl p-8 text-white flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Pronto para anunciar?</h2>
            <p className="text-sm text-teal-50/95 max-w-xl">
              Comece criando seu primeiro anúncio ou definindo seu perfil como corretor(a). Você pode experimentar a plataforma e ajustar seus anúncios a qualquer momento.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/owner/new"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold bg-white text-teal-700 shadow-md hover:shadow-lg hover:bg-teal-50 transition-all"
            >
              <Home className="w-4 h-4 mr-2" />
              Anunciar como pessoa física
            </Link>
            <Link
              href="/become-realtor"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold border border-white/80 text-white hover:bg-white/10 transition-all"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Atuar como corretor(a)
            </Link>
          </div>
        </section>

        {/* Link de volta */}
        <div className="flex justify-start">
          <Link href="/" className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-3 h-3 mr-1" />
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
