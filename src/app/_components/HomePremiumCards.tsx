"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

type CardsVariant = "A" | "B" | "C" | "D" | "E";

type CAnim = "1" | "2" | "3";

type Accent = "teal" | "amber" | "indigo" | "slate";

type Card = {
  key: string;
  href: string;
  title: string;
  desc: string;
  cta: string;
  accent: Accent;
  image: string;
  imageAlt: string;
};

const DEFAULT_CARDS: Card[] = [
  {
    key: "explore",
    href: "/explore",
    title: "Quero encontrar um imóvel",
    desc: "Explore casas e apartamentos com informações claras, filtros rápidos e favoritos para comparar com calma.",
    cta: "Explorar imóveis",
    accent: "teal",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1800&q=80",
    imageAlt: "Casal avaliando um imóvel com ajuda de uma corretora",
  },
  {
    key: "start",
    href: "/start",
    title: "Quero vender ou alugar meu imóvel",
    desc: "Anuncie seu imóvel com enorme visibilidade para toda região e acompanhe interessados com ferramentas de comunicação e organização.",
    cta: "Poste seu primeiro imóvel sem custo",
    accent: "amber",
    image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1800&q=80",
    imageAlt: "Fachada de uma casa moderna e bem iluminada",
  },
  {
    key: "realtor",
    href: "/realtor/register",
    title: "Sou corretor(a)",
    desc: "Centralize seus leads, acompanhe o funil e responda mais rápido com nosso CRM. Se optar, você também pode receber interessados vindos de anúncios de proprietários.",
    cta: "Cadastre-se como corretor(a) no site",
    accent: "indigo",
    image: "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=1800&q=80",
    imageAlt: "Homem e mulher em contexto de negócios",
  },
  {
    key: "agency",
    href: "/agency/register",
    title: "Sou uma imobiliária",
    desc: "Tenha um CRM do time: pipeline, distribuição de leads, gestão de corretores e visão de desempenho em um só lugar.",
    cta: "Conhecer CRM para imobiliárias",
    accent: "slate",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1800&q=80",
    imageAlt: "Equipe trabalhando em uma imobiliária",
  },
];

const ACCENT: Record<Accent, { ring: string; cta: string; chip: string }> = {
  teal: {
    ring: "ring-teal-300/40",
    cta: "bg-teal-500/95 hover:bg-teal-500 text-white",
    chip: "bg-teal-500/15 text-teal-100 border-teal-200/30",
  },
  amber: {
    ring: "ring-amber-300/40",
    cta: "bg-amber-500/95 hover:bg-amber-500 text-white",
    chip: "bg-amber-500/15 text-amber-100 border-amber-200/30",
  },
  indigo: {
    ring: "ring-indigo-300/40",
    cta: "bg-indigo-500/95 hover:bg-indigo-500 text-white",
    chip: "bg-indigo-500/15 text-indigo-100 border-indigo-200/30",
  },
  slate: {
    ring: "ring-slate-300/40",
    cta: "bg-slate-900/90 hover:bg-slate-900 text-white",
    chip: "bg-slate-900/25 text-slate-100 border-slate-200/30",
  },
};

function isVariant(v: string): v is CardsVariant {
  return v === "A" || v === "B" || v === "C" || v === "D" || v === "E";
}

function isCAnim(v: string): v is CAnim {
  return v === "1" || v === "2" || v === "3";
}

function CardOverlay({
  card,
  minH,
  contentAlign,
  overlay,
  anim,
}: {
  card: Card;
  minH: number;
  contentAlign: "left" | "bottom";
  overlay: "lr" | "rl" | "bottom";
  anim?: CAnim;
}) {
  const a = ACCENT[card.accent];

  const overlayClass =
    overlay === "bottom"
      ? "bg-gradient-to-t from-black/80 via-black/35 to-black/10"
      : overlay === "rl"
        ? "bg-gradient-to-l from-black/75 via-black/20 to-transparent"
        : "bg-gradient-to-r from-black/75 via-black/20 to-transparent";

  const cardHover =
    anim === "1"
      ? "shadow-[0_24px_70px_rgba(2,6,23,0.30)] hover:shadow-[0_34px_90px_rgba(2,6,23,0.42)] hover:-translate-y-0.5"
      : anim === "2"
        ? "shadow-[0_22px_64px_rgba(2,6,23,0.26)] hover:shadow-[0_30px_86px_rgba(2,6,23,0.36)] hover:scale-[1.008]"
        : anim === "3"
          ? "shadow-[0_24px_70px_rgba(2,6,23,0.30)] hover:shadow-[0_38px_100px_rgba(2,6,23,0.46)] hover:-translate-y-0.5"
          : "shadow-[0_24px_70px_rgba(2,6,23,0.30)] transition-all hover:-translate-y-1 hover:shadow-[0_34px_90px_rgba(2,6,23,0.42)]";

  const imageAnim =
    anim === "2"
      ? "object-cover scale-[1.02] transition-[filter] duration-500 group-hover:brightness-105 group-hover:saturate-110"
      : "object-cover scale-[1.02]";

  const overlayAnim =
    anim === "2"
      ? "opacity-95 group-hover:opacity-85 transition-opacity duration-500"
      : "";

  const ctaAnim =
    anim === "2"
      ? "transform-gpu transition-transform duration-300 group-hover:translate-x-1"
      : "";

  return (
    <Link
      href={card.href}
      className={`group relative overflow-hidden rounded-[34px] ring-1 ${a.ring} bg-slate-950 transition-all transform-gpu ${cardHover}`}
      style={{ minHeight: `${minH}px` }}
    >
      <div className="absolute inset-0">
        <Image
          src={card.image}
          alt={card.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 60vw"
          className={imageAnim}
        />
        <div className={`absolute inset-0 ${overlayClass} ${overlayAnim}`} />
        {anim === "3" && (
          <div
            className="pointer-events-none absolute -inset-16 bg-gradient-to-r from-white/0 via-white/20 to-white/0 rotate-12 translate-x-[-60%] group-hover:translate-x-[60%] transition-transform duration-700"
            style={{ mixBlendMode: "overlay" }}
          />
        )}
      </div>

      <div
        className={`relative z-10 h-full p-8 sm:p-10 flex flex-col ${
          contentAlign === "bottom" ? "justify-end" : "justify-center"
        }`}
      >
        <div className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold ${a.chip}`}>
          OggaHub
        </div>
        <h3 className="mt-4 text-2xl lg:text-3xl font-display text-white max-w-[30rem]">
          {card.title}
        </h3>
        <p className="mt-3 text-sm lg:text-base text-white/80 leading-relaxed max-w-[36rem]">
          {card.desc}
        </p>
        <div className="mt-6">
          <span className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold ${a.cta} ${ctaAnim}`}>
            {card.cta}
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function MobileCard({ card }: { card: Card }) {
  const a = ACCENT[card.accent];
  return (
    <Link
      href={card.href}
      className={`group relative overflow-hidden rounded-2xl ring-1 ${a.ring} bg-slate-950 shadow-[0_16px_40px_rgba(2,6,23,0.30)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(2,6,23,0.38)]`}
    >
      <div className="relative h-[178px]">
        <Image
          src={card.image}
          alt={card.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover scale-[1.02] group-hover:scale-[1.06] transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
      </div>

      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${a.chip}`}>
          OggaHub
        </div>
        <p className="mt-2 text-base font-semibold text-white leading-snug">
          {card.title}
        </p>
        <p className="mt-1 text-xs text-white/75 line-clamp-2">{card.desc}</p>
        <div className="mt-3">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${a.cta}`}>
            {card.cta}
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePremiumCards() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cardsVariant = useMemo(() => {
    const hasCardsParam = Boolean(searchParams.get("cards"));
    const raw = String((hasCardsParam ? searchParams.get("cards") : "C") || "C").toUpperCase();
    return isVariant(raw) ? raw : "C";
  }, [searchParams]);

  const showPicker = useMemo(() => Boolean(searchParams.get("cards")), [searchParams]);

  const cAnim = useMemo(() => {
    const hasCAnimParam = Boolean(searchParams.get("cAnim"));
    const raw = String((hasCAnimParam ? searchParams.get("cAnim") : "2") || "2");
    return isCAnim(raw) ? raw : "2";
  }, [searchParams]);

  const setVariant = useCallback(
    (v: CardsVariant) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("cards", v);
      router.push(`/?${sp.toString()}`);
    },
    [router, searchParams]
  );

  const setCAnim = useCallback(
    (v: CAnim) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("cAnim", v);
      router.push(`/?${sp.toString()}`);
    },
    [router, searchParams]
  );

  const picker = showPicker ? (
    <div className="hidden md:flex items-center justify-end gap-2 mb-4">
      {(["A", "B", "C", "D", "E"] as CardsVariant[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setVariant(v)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            cardsVariant === v
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white/70 text-gray-700 border-gray-200 hover:bg-white"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  ) : null;

  const cAnimPicker = showPicker && cardsVariant === "C" ? (
    <div className="hidden md:flex items-center justify-end gap-2 -mt-1 mb-4">
      {(["1", "2", "3"] as CAnim[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setCAnim(v)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            cAnim === v
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white/70 text-gray-700 border-gray-200 hover:bg-white"
          }`}
        >
          Animação {v}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:hidden">
        {DEFAULT_CARDS.map((c) => (
          <MobileCard key={c.key} card={c} />
        ))}
      </div>

      <div className="hidden md:block">
        {picker}
        {cAnimPicker}

        {cardsVariant === "A" && (
          <div className="space-y-6">
            <CardOverlay card={DEFAULT_CARDS[0]} minH={360} contentAlign="left" overlay="lr" />
            <CardOverlay card={DEFAULT_CARDS[1]} minH={360} contentAlign="left" overlay="rl" />
            <CardOverlay card={DEFAULT_CARDS[2]} minH={340} contentAlign="left" overlay="lr" />
            <CardOverlay card={DEFAULT_CARDS[3]} minH={340} contentAlign="left" overlay="rl" />
          </div>
        )}

        {cardsVariant === "B" && (
          <div className="grid grid-cols-12 gap-6">
            {DEFAULT_CARDS.map((c) => (
              <div key={c.key} className="col-span-12 lg:col-span-6">
                <CardOverlay card={c} minH={380} contentAlign="bottom" overlay="bottom" />
              </div>
            ))}
          </div>
        )}

        {cardsVariant === "C" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <CardOverlay card={DEFAULT_CARDS[0]} minH={460} contentAlign="left" overlay="lr" anim={cAnim} />
            </div>
            <div className="col-span-12 lg:col-span-7">
              <CardOverlay card={DEFAULT_CARDS[1]} minH={380} contentAlign="left" overlay="rl" anim={cAnim} />
            </div>
            <div className="col-span-12 lg:col-span-5 grid gap-6">
              <CardOverlay card={DEFAULT_CARDS[2]} minH={180} contentAlign="bottom" overlay="bottom" anim={cAnim} />
              <CardOverlay card={DEFAULT_CARDS[3]} minH={180} contentAlign="bottom" overlay="bottom" anim={cAnim} />
            </div>
          </div>
        )}

        {cardsVariant === "D" && (
          <div className="flex gap-6 overflow-x-auto pb-2 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
            {DEFAULT_CARDS.map((c) => (
              <div key={c.key} className="snap-start shrink-0 w-[520px] lg:w-[640px]">
                <CardOverlay card={c} minH={380} contentAlign="left" overlay="lr" />
              </div>
            ))}
          </div>
        )}

        {cardsVariant === "E" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8">
              <CardOverlay card={DEFAULT_CARDS[0]} minH={500} contentAlign="left" overlay="lr" />
            </div>
            <div className="col-span-12 lg:col-span-4 grid gap-6">
              <CardOverlay card={DEFAULT_CARDS[1]} minH={240} contentAlign="bottom" overlay="bottom" />
              <CardOverlay card={DEFAULT_CARDS[2]} minH={240} contentAlign="bottom" overlay="bottom" />
            </div>
            <div className="col-span-12">
              <CardOverlay card={DEFAULT_CARDS[3]} minH={340} contentAlign="left" overlay="rl" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
