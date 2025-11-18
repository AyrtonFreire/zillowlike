"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Menu, Search, HelpCircle, Heart, Loader2 } from "lucide-react";

type Suggestion = { label: string; city: string; state: string; neighborhood: string | null; count?: number };

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
};

export default function SearchHeaderJE({ value, onChange, onSubmit }: Props) {
  const { data: session } = useSession();
  const [focus, setFocus] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler: EventListener = (ev) => {
      const target = ev.target as Node | null;
      if (!wrapRef.current || !target) return;
      if (!wrapRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler, true);
    document.addEventListener("touchstart", handler, true);
    return () => {
      document.removeEventListener("mousedown", handler, true);
      document.removeEventListener("touchstart", handler, true);
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const url = value ? `/api/locations?q=${encodeURIComponent(value)}` : '/api/locations';
        const res = await fetch(url);
        const data = await res.json();
        if (data?.success) setSuggestions((data.suggestions || []).slice(0, 8));
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [value]);

  return (
    <header className="fixed top-0 inset-x-0 z-[12000] bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 h-16 grid grid-cols-3 items-center">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Menu" className="p-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg glass-teal text-white flex items-center justify-center font-bold">Z</div>
            <span className="hidden lg:block text-xl font-bold text-gray-900">ZillowLike</span>
          </Link>
        </div>
        <div className="relative" ref={wrapRef}>
          <form
            onSubmit={(e) => { e.preventDefault(); setOpen(false); onSubmit(); }}
            className={`mx-auto max-w-xl flex items-center gap-2 rounded-full border ${focus ? 'border-gray-400' : 'border-gray-300'} bg-white px-4 py-2.5 shadow-sm`}
          >
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => { setFocus(true); setOpen(true); }}
              onBlur={() => setFocus(false)}
              placeholder="Cidade, região, bairro..."
              className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
            />
            {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            {value && !loading && (
              <button type="button" onClick={() => onChange("")} className="text-gray-500 text-sm hover:text-gray-700">X</button>
            )}
          </form>
          {open && (suggestions.length > 0 || loading) && (
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[min(640px,90vw)] rounded-xl border border-gray-200 bg-white shadow-xl z-[12010]">
              <ul className="max-h-80 overflow-auto py-2">
                {suggestions.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => { onChange(s.label); setOpen(false); onSubmit(); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-800"
                    >
                      {s.label}
                      {typeof s.count === 'number' ? <span className="ml-2 text-gray-500">· {s.count}</span> : null}
                    </button>
                  </li>
                ))}
                {!loading && suggestions.length === 0 && (
                  <li className="px-4 py-3 text-sm text-gray-500">Sem sugestões</li>
                )}
              </ul>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            <HelpCircle className="w-4 h-4" />
            <span>Como funciona</span>
          </button>
          <Link href="/favorites" className="p-2 rounded-lg text-gray-700 hover:bg-gray-50">
            <Heart className="w-5 h-5" />
          </Link>
          {session ? (
            <button type="button" onClick={() => signOut()} className="px-3 py-2 rounded-full border border-gray-300 text-sm text-gray-800 hover:bg-gray-50">Sair</button>
          ) : (
            <button type="button" onClick={() => signIn()} className="px-4 py-2 rounded-full border border-gray-300 text-sm text-gray-800 hover:bg-gray-50">Log in</button>
          )}
        </div>
      </div>
    </header>
  );
}
