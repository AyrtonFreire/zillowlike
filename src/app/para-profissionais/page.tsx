import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import SiteFooter from "@/components/Footer";

const paths = [
  {
    id: "corretor",
    eyebrow: "Corretor",
    title: "Ative seu perfil profissional e comece com um setup enxuto.",
    description:
      "Ideal para quem quer responder leads, organizar o funil e publicar um perfil profissional sem depender de um CRM complexo logo no primeiro dia.",
    bullets: [
      "Conta individual com painel do corretor",
      "Headline, bio, regiões atendidas e canais públicos",
      "Fluxo rápido: conta, CRECI e checklist inicial",
    ],
    primaryHref: "/realtor/register",
    primaryLabel: "Já tenho conta e quero ativar meu perfil",
    secondaryHref: "/auth/register?flow=professional",
    secondaryLabel: "Criar conta para começar",
    icon: UserRound,
    accent: "indigo",
  },
  {
    id: "imobiliaria",
    eyebrow: "Imobiliária",
    title: "Abra um workspace da empresa para gestão do time.",
    description:
      "Crie a estrutura da imobiliária com CNPJ próprio, equipe, visibilidade do funil e organização centralizada de leads.",
    bullets: [
      "Workspace e equipe da imobiliária",
      "Gestão centralizada de leads e operação",
      "Mudança definitiva da conta para agência",
    ],
    primaryHref: "/agency/register",
    primaryLabel: "Cadastrar minha imobiliária",
    secondaryHref: "/auth/register?flow=professional",
    secondaryLabel: "Criar conta antes de continuar",
    icon: Building2,
    accent: "slate",
  },
] as const;

const accentMap = {
  indigo: {
    ring: "border-indigo-200",
    soft: "bg-indigo-50 text-indigo-700",
    button: "bg-indigo-600 hover:bg-indigo-700 text-white",
    subtle: "border-indigo-200 text-indigo-700 hover:bg-indigo-50",
  },
  teal: {
    ring: "border-teal-200",
    soft: "bg-teal-50 text-teal-700",
    button: "bg-teal-600 hover:bg-teal-700 text-white",
    subtle: "border-teal-200 text-teal-700 hover:bg-teal-50",
  },
  slate: {
    ring: "border-slate-200",
    soft: "bg-slate-100 text-slate-800",
    button: "bg-slate-900 hover:bg-slate-950 text-white",
    subtle: "border-slate-200 text-slate-700 hover:bg-slate-50",
  },
} as const;

export default function ProfessionalEntryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      <main>
        <section className="border-b border-gray-200 bg-gradient-to-br from-white via-teal-50/50 to-slate-100/60 pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_420px] lg:items-center">
              <div>
                <span className="inline-flex items-center rounded-full border border-teal-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                  Entrada profissional
                </span>
                <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Escolha o caminho certo para operar como corretor ou imobiliária.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                  Em vez de deixar você descobrir sozinho onde criar conta, ativar perfil e configurar a operação, reunimos tudo em uma jornada clara. Primeiro você entende seu papel. Depois segue para o fluxo certo.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="#corretor"
                    className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                  >
                    Quero atuar como corretor
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#imobiliaria"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Quero cadastrar a imobiliária
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-7">
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">Antes de continuar</div>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Conta de <strong>agência</strong> é diferente de conta de <strong>corretor</strong>. Se você quer operar como empresa, use o fluxo de imobiliária. Se quer atuar como pessoa corretora, ative o perfil de corretor.
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    "Crie sua conta base uma única vez",
                    "Ative o papel correto para sua operação",
                    "Complete o checklist inicial e entre no painel",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Qual opção combina com você agora?</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Os três caminhos abaixo explicam para quem cada fluxo serve, o que desbloqueia e qual é o próximo passo recomendado.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              {paths.map((path) => {
                const accent = accentMap[path.accent];
                const Icon = path.icon;

                return (
                  <section
                    key={path.id}
                    id={path.id}
                    className={`rounded-[30px] border ${accent.ring} bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]`}
                  >
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent.soft}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{path.eyebrow}</div>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{path.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{path.description}</p>
                    <div className="mt-5 space-y-3">
                      {path.bullets.map((item) => (
                        <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex flex-col gap-3">
                      <Link
                        href={path.primaryHref}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${accent.button}`}
                      >
                        {path.primaryLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href={path.secondaryHref}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition ${accent.subtle}`}
                      >
                        {path.secondaryLabel}
                      </Link>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Como a jornada funciona</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                A ideia é simples: você não precisa acertar tudo sozinho. Primeiro entra com uma conta base, depois ativa o papel correto e, em seguida, completa um checklist curto para começar a operar.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                {
                  icon: UserRound,
                  title: "1. Criar conta",
                  description: "Sua conta base serve como ponto de partida para corretor ou imobiliária.",
                },
                {
                  icon: BriefcaseBusiness,
                  title: "2. Ativar papel",
                  description: "Escolha entre perfil de corretor ou workspace de imobiliária.",
                },
                {
                  icon: Users,
                  title: "3. Completar setup",
                  description: "Headline, bio, áreas atendidas, telefone e segurança da conta.",
                },
                {
                  icon: Building2,
                  title: "4. Entrar no painel",
                  description: "Comece a organizar leads, perfil público e operação com mais clareza.",
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-4 text-lg font-semibold text-slate-950">{step.title}</div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
