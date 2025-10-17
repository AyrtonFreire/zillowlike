"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Saved = { label: string; params: string; ts: number };

export default function SavedSearchesPage() {
  const [items, setItems] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await fetch('/api/saved-searches');
      if (!r.ok) { setItems([]); return; }
      const d = await r.json();
      setItems(Array.isArray(d.items) ? d.items : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function remove(ts: number) {
    const url = `/api/saved-searches?ts=${ts}`;
    const r = await fetch(url, { method: 'DELETE' });
    if (r.ok) setItems((arr)=> arr.filter((s)=> s.ts !== ts));
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Barra global (leve) */}
      <div className="bg-white border-b border-gray-200/50">
        <div className="mx-auto max-w-7xl px-4">
          <div className="h-14 flex items-center justify-between text-[15px] md:text-base text-gray-700">
            <nav className="hidden md:flex items-center gap-7 font-medium">
              <Link href="/" className="hover:text-[#006AFF]">Comprar</Link>
              <Link href="/" className="hover:text-[#006AFF]">Alugar</Link>
              <Link href="/" className="hover:text-[#006AFF]">Vender</Link>
              <Link href="/" className="hover:text-[#006AFF]">Financiar</Link>
              <Link href="/" className="hover:text-[#006AFF]">Encontrar agente</Link>
            </nav>
            <Link href="/" className="inline-flex items-center justify-center">
              <Image src="/logo.svg" alt="Zillowlike" width={40} height={40} />
            </Link>
            <div className="hidden md:flex items-center gap-7 font-medium">
              <Link href="/" className="hover:text-[#006AFF]">Gerenciar</Link>
              <Link href="/" className="hover:text-[#006AFF]">Anunciar</Link>
              <Link href="/" className="hover:text-[#006AFF]">Ajuda</Link>
            </div>
          </div>
        </div>
      </div>
      {/* Abas */}
      <div className="bg-white border-b border-gray-200/50">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between h-11">
            <nav className="flex items-stretch gap-6 text-[13px] md:text-sm">
              <Link href="/favorites" className="group relative px-1 py-3 text-gray-600 hover:text-[#006AFF]">
                Imóveis salvos
                <span className="pointer-events-none absolute left-0 right-0 -bottom-[5px] h-[3px] bg-[#006AFF] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
              </Link>
              <Link href="/saved-searches" className="group relative px-1 py-3 text-[#006AFF] font-medium">
                Buscas salvas
                <span className="pointer-events-none absolute left-0 right-0 -bottom-[5px] h-[3px] bg-[#006AFF] scale-x-100 origin-left transition-transform duration-300" />
              </Link>
              <span className="hidden md:inline group relative px-1 py-3 text-gray-400 hover:text-[#006AFF]">
                Caixa de entrada
                <span className="pointer-events-none absolute left-0 right-0 -bottom-[5px] h-[3px] bg-[#006AFF] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
              </span>
              <span className="hidden md:inline group relative px-1 py-3 text-gray-400 hover:text-[#006AFF]">
                Configurações da conta
                <span className="pointer-events-none absolute left-0 right-0 -bottom-[5px] h-[3px] bg-[#006AFF] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
              </span>
            </nav>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Suas buscas salvas</h1>
        {loading ? (
          <div className="text-gray-600">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">Você ainda não salvou nenhuma busca.</div>
        ) : (
          <div className="space-y-3">
            {items.map((s) => (
              <div key={s.ts} className="bg-white rounded-lg border px-4 py-3 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{s.label}</span>
                  <span className="text-xs text-gray-500">{new Date(s.ts).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/?${s.params}`} className="text-sm text-blue-600 hover:text-blue-800">Aplicar</Link>
                  <button onClick={()=>remove(s.ts)} className="text-sm text-red-600 hover:text-red-700">Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
