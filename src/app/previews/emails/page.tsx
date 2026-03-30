import Link from "next/link";
import { getEmailTemplateShowcase } from "@/lib/email-templates";

const showcaseBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

const showcase = getEmailTemplateShowcase(showcaseBaseUrl);

type ShowcaseKey = keyof typeof showcase;

type TemplatePreviewMeta = {
  key: ShowcaseKey;
  label: string;
  description: string;
};

const templateMeta: TemplatePreviewMeta[] = [
  {
    key: "emailConfirmation",
    label: "Confirmação de e-mail",
    description: "Fluxo de ativação inicial da conta do usuário.",
  },
  {
    key: "welcome",
    label: "Boas-vindas",
    description: "Recepção inicial com direcionamento para a plataforma.",
  },
  {
    key: "passwordReset",
    label: "Redefinição de senha",
    description: "Fluxo de segurança para recuperação de acesso.",
  },
  {
    key: "newLead",
    label: "Novo lead",
    description: "Notificação para corretor sobre novo interessado em imóvel.",
  },
  {
    key: "interestedMessage",
    label: "Nova mensagem de interessado",
    description: "Aviso de nova interação no chat de um imóvel.",
  },
  {
    key: "accountActivity",
    label: "Atividade da conta",
    description: "Alerta de segurança ou movimentação relevante da conta.",
  },
  {
    key: "weeklySummary",
    label: "Resumo semanal",
    description: "Resumo de performance, atividade e destaques da semana.",
  },
  {
    key: "listingStatus",
    label: "Status do anúncio",
    description: "Atualização sobre aprovação, publicação ou revisão do anúncio.",
  },
  {
    key: "productUpdate",
    label: "Atualização de produto",
    description: "Comunicado de novidade ou melhoria importante na plataforma.",
  },
  {
    key: "billing",
    label: "Cobrança e assinatura",
    description: "Comunicação sobre pagamento, plano e status da assinatura.",
  },
];

const templates = templateMeta.map((item) => ({
  ...item,
  ...showcase[item.key],
}));

export default function EmailPreviewsPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,155,145,0.18),_transparent_30%),linear-gradient(180deg,_#03110F_0%,_#051816_45%,_#071B18_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#67D6CC] sm:text-sm">
                Previews
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Preview de e-mails do OggaHub
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                Esta página renderiza no navegador os templates centralizados do módulo de e-mails para revisão visual,
                copy e consistência do design system.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="rounded-2xl border border-[#22524B] bg-[#0B211D] px-4 py-3 text-sm text-white/75">
                <div>
                  <span className="font-medium text-white">Rota:</span> /previews/emails
                </div>
                <div className="mt-1 break-all">
                  <span className="font-medium text-white">Base URL:</span> {showcaseBaseUrl}
                </div>
              </div>
              <Link
                href="/previews/ogga-hub"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/5 hover:text-white"
              >
                Ver outros previews
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {templates.map((template, index) => (
              <a
                key={template.key}
                href={`#${template.key}`}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 transition hover:border-[#009B91]/50 hover:bg-white/[0.06]"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#67D6CC]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 text-base font-semibold text-white">{template.label}</div>
                <div className="mt-2 text-sm leading-6 text-white/65">{template.description}</div>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {templates.map((template, index) => (
            <section
              key={template.key}
              id={template.key}
              className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_20px_80px_rgba(0,0,0,0.28)]"
            >
              <div className="border-b border-white/10 bg-black/20 px-5 py-5 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#67D6CC]">
                      Template {String(index + 1).padStart(2, "0")}
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      {template.label}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">{template.description}</p>
                  </div>

                  <a
                    href={`#${template.key}`}
                    className="inline-flex w-fit items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/5 hover:text-white"
                  >
                    Link desta seção
                  </a>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
                  <div className="rounded-2xl border border-[#22524B] bg-[#081B18] px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Assunto</div>
                    <div className="mt-2 text-base font-medium leading-7 text-white">{template.subject}</div>
                  </div>
                  <div className="rounded-2xl border border-[#22524B] bg-[#081B18] px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Uso sugerido</div>
                    <div className="mt-2 text-sm leading-7 text-white/75">
                      Revisar layout, hierarquia visual, copy e comportamento responsivo do HTML centralizado.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#DDE7E4] p-3 sm:p-4 lg:p-6">
                <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_25px_80px_rgba(7,24,22,0.16)]">
                  <iframe
                    title={template.label}
                    srcDoc={template.html}
                    className="block h-[860px] w-full bg-white md:h-[920px] xl:h-[980px]"
                    loading="lazy"
                  />
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
