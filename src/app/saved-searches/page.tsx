"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ModernNavbar } from "@/components/modern";
import SiteFooter from "@/components/Footer";
import Button from "@/components/ui/Button";
import { Bookmark, Trash2 } from "lucide-react";

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
      <ModernNavbar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 font-display">Buscas Salvas</h1>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
            <Bookmark className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma busca salva</h2>
            <p className="text-gray-600 mb-6">Salve suas buscas e receba notificações sobre novos imóveis.</p>
            <Link href="/">
              <Button>Explorar Imóveis</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((s) => (
              <div key={s.ts} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{s.label || 'Busca sem título'}</h3>
                    <p className="text-xs text-gray-500">{new Date(s.ts).toLocaleString('pt-BR')}</p>
                  </div>
                  <button onClick={()=>remove(s.ts)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Link href={`/?${s.params}`}>
                  <Button variant="secondary" className="w-full">Aplicar Busca</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
