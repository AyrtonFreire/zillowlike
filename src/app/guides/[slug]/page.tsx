import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ModernNavbar } from "@/components/modern";
import MobileHeaderZillow from "@/components/modern/MobileHeaderZillow";
import SiteFooter from "@/components/Footer";
import { ArrowLeft, CheckCircle2, FileText, Home, Info, MapPin, Percent, ShieldCheck, TrendingUp } from "lucide-react";

const GUIDE_META: Record<
  string,
  {
    title: string;
    description: string;
    badge: string;
    img: string;
  }
> = {
  "financiar-primeiro-imovel": {
    title: "Como financiar seu primeiro imóvel",
    description: "Etapas do financiamento, documentos essenciais e como comparar modalidades e indexadores.",
    badge: "Financiamento",
    img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1470&auto=format&fit=crop",
  },
  "checklist-locacao": {
    title: "Checklist para alugar sem dor de cabeça",
    description: "Do primeiro contato à vistoria final: o que conferir no contrato, no imóvel e nas garantias.",
    badge: "Atualizado",
    img: "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1470&auto=format&fit=crop",
  },
  "avaliar-bairro": {
    title: "Como avaliar um bairro",
    description: "Transporte, serviços, segurança, infraestrutura e como checar regras urbanísticas (zoneamento).",
    badge: "Novo",
    img: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=1470&auto=format&fit=crop",
  },
  "negociar-preco": {
    title: "Dicas para negociar preço",
    description: "Estratégias e argumentos práticos para propor, contra-ofertar e fechar um bom acordo.",
    badge: "Negociação",
    img: "https://images.unsplash.com/photo-1542744094-24638eff58bb?q=80&w=1470&auto=format&fit=crop",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = GUIDE_META[slug];
  if (!meta) return { title: "Guia | OggaHub" };
  return {
    title: `${meta.title} | OggaHub`,
    description: meta.description,
    alternates: { canonical: `/guides/${slug}` },
  };
}

function SourcesList({ sources }: { sources: Array<{ label: string; url: string }> }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-3">Fontes</h2>
      <ul className="space-y-2 text-sm text-gray-700">
        {sources.map((s) => (
          <li key={s.url} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-600" />
            <div>
              <div className="font-semibold">{s.label}</div>
              <a className="text-blue-700 hover:underline break-all" href={s.url} target="_blank" rel="noopener noreferrer">
                {s.url}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">{icon}</div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function GuideSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = GUIDE_META[slug];
  if (!meta) notFound();

  const commonHeader = (
    <>
      <MobileHeaderZillow variant="solid" />
      <div className="hidden md:block">
        <ModernNavbar forceLight />
      </div>
      <div className="h-16 md:h-0" />
    </>
  );

  if (slug === "financiar-primeiro-imovel") {
    return (
      <main className="min-h-screen bg-gray-50">
        {commonHeader}
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 text-white">
          <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
            <Link href="/guides" className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Voltar para guias
            </Link>
            <div className="mt-6 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
                  <span>{meta.badge}</span>
                </div>
                <h1 className="mt-4 text-3xl md:text-4xl font-bold">{meta.title}</h1>
                <p className="mt-3 text-teal-100 max-w-xl">{meta.description}</p>
              </div>
              <div className="relative h-44 md:h-56 rounded-2xl overflow-hidden border border-white/15">
                <Image src={meta.img} alt={meta.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10 md:py-12">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Section title="Passo a passo do financiamento" icon={<TrendingUp className="w-5 h-5" />}>
                <div className="space-y-4">
                  <div>
                    <div className="font-semibold text-gray-900">1) Faça uma simulação</div>
                    <div>Simule prestação, prazo e condições. Use o simulador do banco e compare cenários com entrada maior/menor.</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">2) Análise de crédito</div>
                    <div>O banco valida renda e documentos e avalia possibilidade de uso do FGTS, quando aplicável.</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">3) Análise de engenharia</div>
                    <div>O imóvel é avaliado para confirmar valor e condições de uso como garantia.</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">4) Assinatura e registro em cartório</div>
                    <div>Após a aprovação, assina-se o contrato e ele precisa ser registrado no cartório de registro de imóveis para liberação do crédito.</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">5) Pagamentos e gestão</div>
                    <div>Você paga as parcelas e pode amortizar saldo, ajustar contrato e acompanhar pelo internet banking/app.</div>
                  </div>
                </div>
              </Section>

              <Section title="Documentos que normalmente são solicitados" icon={<FileText className="w-5 h-5" />}>
                <div className="space-y-5">
                  <div>
                    <div className="font-semibold text-gray-900 mb-2">Comprador(es)</div>
                    <Checklist
                      items={[
                        "Documento de identificação com foto",
                        "CPF (quando não constar no documento principal)",
                        "Comprovante de renda",
                        "Comprovante de residência",
                        "Comprovante de estado civil",
                      ]}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-2">Se usar FGTS</div>
                    <Checklist
                      items={[
                        "Carteira de trabalho",
                        "Extrato do FGTS",
                        "Última declaração do Imposto de Renda (e recibo de entrega)",
                      ]}
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-2">Vendedor(es) e imóvel</div>
                    <Checklist
                      items={[
                        "Documentos de identificação/CPF do vendedor e estado civil",
                        "Matrícula do imóvel (certidão de inteiro teor/atualizada)",
                        "Outras certidões podem ser solicitadas pelo banco/cartório (conforme o caso)",
                      ]}
                    />
                  </div>
                </div>
              </Section>

              <Section title="Como comparar modalidades e indexadores" icon={<Info className="w-5 h-5" />}>
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-gray-900">SAC vs PRICE:</span> no SAC, a amortização tende a ser maior no início e a prestação costuma cair ao longo do tempo; no PRICE, a prestação tende a ser mais estável (mas pode variar com indexadores).
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">TR, IPCA e taxa fixa:</span> a TR e o IPCA atualizam o saldo devedor; taxa fixa dá mais previsibilidade porque o saldo não sofre atualização por indexador.
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Cuidado com custo total:</span> além de juros e amortização, a prestação pode incluir tarifa de administração (em contratos SFH) e seguros (ex.: MIP e DFI), conforme regras do banco.
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Regra prática:</span> compare cenários com a mesma entrada e prazo, e olhe tanto a prestação inicial quanto a evolução ao longo do tempo.
                  </div>
                </div>
              </Section>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                    <Home className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-gray-900">Dica rápida</div>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  Se você está em dúvida entre opções, comece definindo um limite confortável de parcela e uma entrada mínima. Depois, simule com prazos diferentes e veja o que muda no custo total.
                </div>
              </div>

              <SourcesList
                sources={[
                  {
                    label: "CAIXA – Financiamento de imóvel (passo a passo, tarifas e indexadores)",
                    url: "https://www.caixa.gov.br/voce/habitacao/financiamento-de-imoveis/Paginas/default.aspx",
                  },
                  {
                    label: "CAIXA – Perguntas frequentes (prazo, quota, indexadores, composição da prestação, documentação)",
                    url: "https://www.caixa.gov.br/voce/habitacao/perguntas-frequentes-novos-financiamentos/Paginas/default.aspx",
                  },
                  {
                    label: "CAIXA – Documentação básica para solicitação de crédito imobiliário", 
                    url: "https://www.caixa.gov.br/Downloads/habitacao-documentos-gerais/Docbas-solicit-Cred-Imob.pdf",
                  },
                  {
                    label: "IBGE – Inflação, IPCA e INPC (explicação oficial)",
                    url: "https://www.ibge.gov.br/explica/inflacao.php",
                  },
                ]}
              />
            </div>
          </div>
        </div>

        <SiteFooter />
      </main>
    );
  }

  if (slug === "checklist-locacao") {
    return (
      <main className="min-h-screen bg-gray-50">
        {commonHeader}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
            <Link href="/guides" className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Voltar para guias
            </Link>
            <div className="mt-6 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
                  <span>{meta.badge}</span>
                </div>
                <h1 className="mt-4 text-3xl md:text-4xl font-bold">{meta.title}</h1>
                <p className="mt-3 text-white/80 max-w-xl">{meta.description}</p>
              </div>
              <div className="relative h-44 md:h-56 rounded-2xl overflow-hidden border border-white/15">
                <Image src={meta.img} alt={meta.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10 md:py-12 space-y-6">
          <Section title="Antes de assinar (checklist)" icon={<CheckCircle2 className="w-5 h-5" />}>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="font-semibold text-gray-900 mb-2">Imóvel e vistoria</div>
                <Checklist
                  items={[
                    "Visite em horários diferentes (dia/noite e fim de semana)",
                    "Teste elétrica, hidráulica, fechaduras e sinais de infiltração",
                    "Confirme o que fica no imóvel (móveis, armários, eletros)",
                    "Faça vistoria detalhada com fotos/vídeo e anexos no laudo",
                  ]}
                />
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-2">Contrato e condições</div>
                <Checklist
                  items={[
                    "Valor do aluguel, data de vencimento e forma de pagamento",
                    "Cláusula de reajuste e periodicidade (em geral, anual)",
                    "Prazo do contrato e multa proporcional em caso de saída antecipada",
                    "Definição clara do que é responsabilidade do locador e do locatário",
                    "Condomínio: diferencie despesas ordinárias vs extraordinárias",
                    "Garanti as: caução, fiança ou seguro-fiança (evite acumular mais de uma)",
                  ]}
                />
              </div>
            </div>
          </Section>

          <Section title="Durante a locação" icon={<ShieldCheck className="w-5 h-5" />}>
            <Checklist
              items={[
                "Guarde recibos/pagamentos e comunicações com a imobiliária/locador",
                "Informe por escrito qualquer problema estrutural ou vício anterior",
                "Peça comprovantes quando houver cobranças adicionais",
                "Registre manutenções (ex.: revisão de gás, pequenos reparos) com notas",
              ]}
            />
          </Section>

          <Section title="Na saída (entrega das chaves)" icon={<Home className="w-5 h-5" />}>
            <Checklist
              items={[
                "Agende vistoria final e compare com o laudo de entrada",
                "Solicite quitação de débitos (condomínio, contas e aluguel) antes de encerrar",
                "Devolva o imóvel no estado previsto (salvo desgaste natural) e guarde protocolos",
              ]}
            />
          </Section>

          <Section title="Pontos de atenção na Lei do Inquilinato (resumo prático)" icon={<FileText className="w-5 h-5" />}>
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-gray-900">Prazo e devolução:</span> contratos podem ter qualquer prazo; em saída antecipada, a multa tende a ser proporcional ao período restante e pode haver exceções específicas.
              </div>
              <div>
                <span className="font-semibold text-gray-900">Deveres:</span> há deveres do locador (entregar imóvel em condições, garantir uso pacífico, etc.) e do locatário (pagar aluguel e encargos, zelar pelo imóvel, devolver ao fim).
              </div>
              <div>
                <span className="font-semibold text-gray-900">Garantias:</span> exigir mais de uma modalidade de garantia no mesmo contrato pode configurar penalidade.
              </div>
              <div>
                <span className="font-semibold text-gray-900">Aluguel antecipado:</span> via de regra, o locador não pode exigir pagamento antecipado, com exceções previstas na própria lei.
              </div>
            </div>
          </Section>

          <SourcesList
            sources={[
              {
                label: "Lei do Inquilinato (Lei nº 8.245/1991) – versão atualizada (Câmara dos Deputados)",
                url: "https://www2.camara.leg.br/legin/fed/lei/1991/lei-8245-18-outubro-1991-322506-normaatualizada-pl.html",
              },
              {
                label: "PROCON-SP – Boletim sobre aluguel residencial (Lei 8.245/91)",
                url: "https://www.procon.sp.gov.br/wp-content/uploads/files/Boletim11.pdf",
              },
            ]}
          />
        </div>

        <SiteFooter />
      </main>
    );
  }

  if (slug === "avaliar-bairro") {
    return (
      <main className="min-h-screen bg-gray-50">
        {commonHeader}
        <div className="bg-gradient-to-br from-emerald-700 to-teal-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
            <Link href="/guides" className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Voltar para guias
            </Link>
            <div className="mt-6 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
                  <span>{meta.badge}</span>
                </div>
                <h1 className="mt-4 text-3xl md:text-4xl font-bold">{meta.title}</h1>
                <p className="mt-3 text-emerald-100 max-w-xl">{meta.description}</p>
              </div>
              <div className="relative h-44 md:h-56 rounded-2xl overflow-hidden border border-white/15">
                <Image src={meta.img} alt={meta.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10 md:py-12 space-y-6">
          <Section title="Checklist rápido do bairro" icon={<MapPin className="w-5 h-5" />}>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Checklist
                  items={[
                    "Mobilidade: tempo real para trabalho/escola e opções de transporte",
                    "Serviços: mercado, farmácia, hospitais, escolas e academia",
                    "Infraestrutura: qualidade de internet, iluminação pública e saneamento",
                    "Ruído: bares, feiras, vias movimentadas e horários de pico",
                  ]}
                />
              </div>
              <div>
                <Checklist
                  items={[
                    "Segurança: percepção local e padrões do entorno (dia/noite)",
                    "Riscos: histórico de alagamento/enchente e problemas de drenagem",
                    "Valorização: lançamentos, obras, comércio e perfil de ocupação",
                    "Regra urbanística: zoneamento e o que pode ser construído ao redor",
                  ]}
                />
              </div>
            </div>
          </Section>

          <Section title="Como investigar na prática" icon={<Info className="w-5 h-5" />}>
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-gray-900">1) Visitas em horários diferentes:</span> faça uma visita no horário comercial e outra à noite. Se possível, vá em um fim de semana.
              </div>
              <div>
                <span className="font-semibold text-gray-900">2) Caminhe 10–15 minutos ao redor:</span> observe iluminação, fluxo de pessoas, comércio e conservação.
              </div>
              <div>
                <span className="font-semibold text-gray-900">3) Converse com moradores/comerciantes:</span> pergunte sobre segurança, barulho, transporte e alagamentos.
              </div>
              <div>
                <span className="font-semibold text-gray-900">4) Verifique regras e projetos futuros:</span> consulte a prefeitura da sua cidade (zoneamento, uso do solo e obras).
              </div>
            </div>
          </Section>

          <Section title="Zoneamento: o que é e por que importa" icon={<FileText className="w-5 h-5" />}>
            <div className="space-y-3">
              <div>
                Zoneamento define o que pode ser construído (e com que intensidade) em determinadas áreas. Isso influencia ruído, tráfego, sombra, ventilação e valorização.
              </div>
              <div>
                Um exemplo de ferramenta pública é o GeoSampa (Município de São Paulo), que permite consultar a zona usando o número do contribuinte do IPTU (SQL: setor-quadra-lote) e visualizar parâmetros e mapas urbanísticos.
              </div>
              <div>
                Mesmo fora de São Paulo, a lógica é a mesma: procure um portal de mapas/zoneamento da prefeitura ou a secretaria de urbanismo local.
              </div>
            </div>
          </Section>

          <SourcesList
            sources={[
              {
                label: "Prefeitura de SP – GeoSampa (consulta de zoneamento por SQL)",
                url: "https://gestaourbana.prefeitura.sp.gov.br/noticias/geosampa-consulte-o-zoneamento-no-mapa/",
              },
            ]}
          />
        </div>

        <SiteFooter />
      </main>
    );
  }

  if (slug === "negociar-preco") {
    return (
      <main className="min-h-screen bg-gray-50">
        {commonHeader}
        <div className="bg-gradient-to-br from-indigo-700 to-slate-900 text-white">
          <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
            <Link href="/guides" className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Voltar para guias
            </Link>
            <div className="mt-6 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
                  <span>{meta.badge}</span>
                </div>
                <h1 className="mt-4 text-3xl md:text-4xl font-bold">{meta.title}</h1>
                <p className="mt-3 text-white/80 max-w-xl">{meta.description}</p>
              </div>
              <div className="relative h-44 md:h-56 rounded-2xl overflow-hidden border border-white/15">
                <Image src={meta.img} alt={meta.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10 md:py-12 space-y-6">
          <Section title="O que fazer antes de ofertar" icon={<TrendingUp className="w-5 h-5" />}>
            <Checklist
              items={[
                "Compare imóveis similares (mesma região, metragem e padrão)",
                "Liste custos extras (reforma, pintura, elétrica/hidráulica, móveis)",
                "Pergunte há quanto tempo está anunciado e qual o motivo da venda",
                "Tenha seu limite máximo definido (e um valor ideal para começar)",
              ]}
            />
          </Section>

          <Section title="Estratégia de proposta" icon={<Percent className="w-5 h-5" />}>
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-gray-900">Oferta inicial com margem:</span> comece abaixo do seu limite para abrir espaço para contraproposta, mas evite números irreais.
              </div>
              <div>
                <span className="font-semibold text-gray-900">Use fatos, não opinião:</span> comparáveis da região, tempo de anúncio e custos de correção são argumentos mais fortes do que “achei caro”.
              </div>
              <div>
                <span className="font-semibold text-gray-900">Negocie condições:</span> além do preço, negocie prazo, mobília, itens embutidos, data de mudança e pendências.
              </div>
            </div>
          </Section>

          <Section title="Faixas de desconto: referência de mercado" icon={<Info className="w-5 h-5" />}>
            <div className="space-y-3">
              <div>
                Em médias históricas, descontos de fechamento podem ficar na faixa de <span className="font-semibold text-gray-900">4% a 5%</span> em grandes capitais (referência QuintoAndar). Em pagamentos à vista, algumas análises citam a possibilidade de negociar algo como <span className="font-semibold text-gray-900">5% a 10%</span>, dependendo do imóvel e da urgência.
              </div>
              <div>
                O objetivo não é “achar o maior desconto”, e sim construir uma proposta defensável que faça sentido para ambos os lados e preserve a negociação.
              </div>
            </div>
          </Section>

          <Section title="Checklist final (antes de assinar)" icon={<ShieldCheck className="w-5 h-5" />}>
            <Checklist
              items={[
                "Revise documentação do imóvel e do vendedor (certidões, matrícula, débitos)",
                "Faça vistoria técnica se necessário (especialmente em imóveis antigos)",
                "Considere assessoria jurídica para revisar cláusulas do contrato",
              ]}
            />
          </Section>

          <SourcesList
            sources={[
              {
                label: "Exame – Como negociar o preço de um imóvel à vista (dicas e contexto)",
                url: "https://exame.com/mercado-imobiliario/como-negociar-o-preco-de-um-imovel-a-vista-veja-dicas/",
              },
              {
                label: "QuintoAndar – Quanto pedir de desconto à vista (com referência de relatório)",
                url: "https://www.quintoandar.com.br/guias/quanto-pedir-de-desconto-a-vista-em-imovel/",
              },
            ]}
          />
        </div>

        <SiteFooter />
      </main>
    );
  }

  notFound();
}
