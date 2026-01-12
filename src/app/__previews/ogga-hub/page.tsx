import Image from "next/image";
import Link from "next/link";

const profiles = [
  {
    key: "buyer",
    title: "Quero encontrar um imóvel",
    description:
      "Explore casas e apartamentos com informações claras, filtros rápidos e favoritos para comparar com calma.",
    cta: "Explorar imóveis",
    href: "/#explorar",
    accent: "teal",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "owner",
    title: "Quero vender ou alugar meu imóvel",
    description:
      "Anuncie seu imóvel com visibilidade e acompanhe interessados com ferramentas de comunicação e organização.",
    cta: "Poste seu primeiro imóvel",
    href: "/start",
    accent: "amber",
    image:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "realtor",
    title: "Sou corretor(a)",
    description:
      "Centralize seus leads, acompanhe o funil e responda mais rápido com nosso CRM. Se optar, receba interessados vindos de anúncios de proprietários.",
    cta: "Cadastrar como corretor(a)",
    href: "/realtor/register",
    accent: "indigo",
    image:
      "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    key: "agency",
    title: "Sou uma imobiliária",
    description:
      "Tenha um CRM do time: pipeline, distribuição de leads, gestão de corretores e visão de desempenho em um só lugar.",
    cta: "Conhecer CRM",
    href: "/agency/register",
    accent: "slate",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  },
] as const;

const accentStyles: Record<string, { bar: string; ring: string; text: string; border: string; hover: string }> = {
  teal: {
    bar: "bg-teal-700",
    ring: "ring-teal-200",
    text: "text-teal-700",
    border: "border-teal-200",
    hover: "hover:bg-teal-50",
  },
  amber: {
    bar: "bg-amber-700",
    ring: "ring-amber-200",
    text: "text-amber-700",
    border: "border-amber-200",
    hover: "hover:bg-amber-50",
  },
  indigo: {
    bar: "bg-indigo-900",
    ring: "ring-indigo-200",
    text: "text-indigo-700",
    border: "border-indigo-200",
    hover: "hover:bg-indigo-50",
  },
  slate: {
    bar: "bg-slate-900",
    ring: "ring-slate-200",
    text: "text-slate-700",
    border: "border-slate-200",
    hover: "hover:bg-slate-50",
  },
};

export default function OggaHubPreviewsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.18em] text-teal-600 uppercase">
            Previews
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-display text-gray-900">
            Sessão “Para quem é o OggaHub”
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600">
            Abaixo estão 3 variações visuais usando o mesmo conteúdo. Escolha a que mais te agrada e eu aplico
            no `src/app/page.tsx`.
          </p>
        </div>

        <div className="mt-10 space-y-14">
          <section className="space-y-6">
            <header className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Variação A — Faixas horizontais alternadas</h2>
              <p className="text-sm text-gray-600">
                Cards em layout horizontal, alternando imagem à esquerda/direita. Bom para leitura rápida e “efeito zig-zag”.
              </p>
            </header>

            <div className="space-y-5">
              {profiles.map((p, idx) => {
                const a = accentStyles[p.accent];
                const reverse = idx % 2 === 1;
                return (
                  <div
                    key={p.key}
                    className={`group relative overflow-hidden rounded-3xl border bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)] ${a.border}`}
                  >
                    <div className={`h-2 ${a.bar}`} />
                    <div className={`grid gap-0 md:grid-cols-12 ${reverse ? "md:[&>div:first-child]:order-2" : ""}`}>
                      <div className="relative md:col-span-5 min-h-[220px]">
                        <Image
                          src={p.image}
                          alt={p.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 40vw"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/10 to-transparent" />
                      </div>

                      <div className="md:col-span-7 p-6 sm:p-8">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{p.title}</h3>
                        <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">{p.description}</p>
                        <div className="mt-5">
                          <Link
                            href={p.href}
                            className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold border ${a.border} ${a.text} ${a.hover} transition-all`}
                          >
                            {p.cta}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-6">
            <header className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Variação B — Stack “offset” (alternando alinhamento)</h2>
              <p className="text-sm text-gray-600">
                Cards horizontais mais compactos, alternando alinhamento esquerda/direita (efeito “escadinha” como no seu desenho).
              </p>
            </header>

            <div className="space-y-5">
              {profiles.map((p, idx) => {
                const a = accentStyles[p.accent];
                const alignRight = idx % 2 === 1;
                return (
                  <div
                    key={p.key}
                    className={`${alignRight ? "md:ml-auto" : ""} max-w-4xl group rounded-3xl overflow-hidden border bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)] ${a.border}`}
                  >
                    <div className="grid md:grid-cols-12">
                      <div className={`md:col-span-4 ${a.bar} p-6 sm:p-7 flex items-center gap-4`}>
                        <div className={`relative h-16 w-16 rounded-2xl overflow-hidden ring-4 ${a.ring} bg-white/15`}>
                          <Image
                            src={p.image}
                            alt={p.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/80">Perfil</p>
                          <h3 className="mt-1 text-white font-semibold leading-tight">{p.title}</h3>
                        </div>
                      </div>

                      <div className="md:col-span-8 p-6 sm:p-7">
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{p.description}</p>
                        <div className="mt-5">
                          <Link
                            href={p.href}
                            className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold border ${a.border} ${a.text} ${a.hover} transition-all`}
                          >
                            {p.cta}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-6">
            <header className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Variação C — Bento grid (moderna)</h2>
              <p className="text-sm text-gray-600">
                Uma grade “bento” com hierarquia (cards maiores/menores). Fica forte em desktop e vira stack no mobile.
              </p>
            </header>

            <div className="grid gap-6 md:grid-cols-12">
              {profiles.map((p, idx) => {
                const a = accentStyles[p.accent];
                const colSpan = idx === 0 ? "md:col-span-7" : idx === 1 ? "md:col-span-5" : "md:col-span-6";
                const minH = idx < 2 ? "min-h-[260px]" : "min-h-[220px]";
                return (
                  <div
                    key={p.key}
                    className={`${colSpan} ${minH} relative overflow-hidden rounded-3xl border bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)] ${a.border}`}
                  >
                    <div className="absolute inset-0">
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
                    </div>

                    <div className="relative z-10 h-full p-6 sm:p-8 flex flex-col justify-end">
                      <div className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold bg-white/15 text-white border border-white/20`}>
                        {idx + 1} / {profiles.length}
                      </div>
                      <h3 className="mt-3 text-xl sm:text-2xl font-semibold text-white">{p.title}</h3>
                      <p className="mt-2 text-sm sm:text-base text-white/85 max-w-xl leading-relaxed">{p.description}</p>
                      <div className="mt-5">
                        <Link
                          href={p.href}
                          className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold bg-white text-gray-900 hover:bg-white/90 transition-all"
                        >
                          {p.cta}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
