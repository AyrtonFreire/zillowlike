"use client";

import Link from "next/link";
import Image from "next/image";

const GUIDES = [
  { slug: "financiar-primeiro-imovel", title: "Como financiar seu primeiro imóvel", blurb: "Entenda as etapas, documentos e simulações de parcela.", img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1470&auto=format&fit=crop", badge: "Financiamento" },
  { slug: "checklist-locacao", title: "Checklist para alugar sem dor de cabeça", blurb: "Do primeiro contato à vistoria final.", img: "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1470&auto=format&fit=crop", badge: "Atualizado" },
  { slug: "avaliar-bairro", title: "Como avaliar um bairro", blurb: "Transporte, serviços, segurança e qualidade de vida.", img: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=1470&auto=format&fit=crop", badge: "Novo" },
  { slug: "negociar-preco", title: "Dicas para negociar preço", blurb: "Estratégias para propor e fechar um bom acordo.", img: "https://images.unsplash.com/photo-1542744094-24638eff58bb?q=80&w=1470&auto=format&fit=crop", badge: "Negociação" },
];

export default function Guides() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Guias</h2>
        <Link href="/guides" prefetch={false} className="text-blue-600 hover:text-blue-800 text-sm">Ver todos</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {GUIDES.map(g => (
          <Link key={g.slug} href={`/guides/${g.slug}`} prefetch={false} className="group block rounded-xl overflow-hidden bg-white border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="relative h-36 w-full overflow-hidden">
              <Image src={g.img} alt={g.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
              {g.badge && (
                <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white/90 text-gray-800 shadow">
                  {g.badge}
                </span>
              )}
            </div>
            <div className="p-4">
              <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{g.title}</div>
              <div className="mt-1 text-sm text-gray-600 line-clamp-2">{g.blurb}</div>
              <div className="mt-3 inline-flex items-center text-blue-600 text-sm font-medium group-hover:underline">
                Ler guia
                <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
