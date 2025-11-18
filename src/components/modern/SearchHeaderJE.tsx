"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Menu, Search, HelpCircle, Heart, Loader2, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler: EventListener = (ev) => {
      const target = ev.target as Node | null;
      if (wrapRef.current && target && !wrapRef.current.contains(target)) setOpen(false);
      if (userMenuRef.current && target && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
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

  const role = (session as any)?.user?.role || "USER";

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 h-16 grid grid-cols-3 items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Menu"
            className="p-2 rounded-lg hover:bg-gray-100 md:hidden"
            onClick={() => { setLeftOpen(true); setRightOpen(false); }}
          >
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
          {true && (
            <nav className="hidden md:flex items-center gap-4 mr-3 text-[15px] font-semibold text-gray-800">
              {session && role === 'OWNER' && (
                <>
                  <Link href="/owner/properties" className="hover:text-teal">Meus anúncios</Link>
                  <Link href="/owner/leads" className="hover:text-teal">Meus leads</Link>
                  <Link href="/owner/dashboard" className="hover:text-teal">Dashboard</Link>
                </>
              )}
              {session && (role === 'REALTOR' || role === 'AGENCY') ? (
                <>
                  <Link href="/broker/leads" className="hover:text-teal">Leads</Link>
                  <Link href="/broker/properties" className="hover:text-teal">Imóveis</Link>
                  <Link href="/broker/dashboard" className="hover:text-teal">Painel</Link>
                </>
              ) : null}
              {session && role === 'ADMIN' && (
                <>
                  <Link href="/admin" className="hover:text-teal">Painel Admin</Link>
                  <Link href="/admin/properties" className="hover:text-teal">Gerenciar imóveis</Link>
                  <Link href="/admin/users" className="hover:text-teal">Usuários</Link>
                </>
              )}
              {(!session || role === 'USER') && (
                <>
                  <Link href="/?sort=recent" className="hover:text-teal">Comprar</Link>
                  <Link href="/?status=RENT" className="hover:text-teal">Alugar</Link>
                  <Link href="/owner/new" className="hover:text-teal">Anunciar imóvel</Link>
                </>
              )}
            </nav>
          )}
          <button type="button" className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            <HelpCircle className="w-4 h-4" />
            <span>Como funciona</span>
          </button>
          <Link href="/favorites" className="hidden md:inline-flex p-2 rounded-lg text-gray-700 hover:bg-gray-50">
            <Heart className="w-5 h-5" />
          </Link>
          {session ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => {
                  if (window.matchMedia('(min-width: 768px)').matches) {
                    setUserMenuOpen(v => !v);
                  } else {
                    setRightOpen(true);
                    setLeftOpen(false);
                  }
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-medium text-sm">
                  {(session.user?.name?.charAt(0) || 'U').toUpperCase()}
                </div>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-xl z-[12020]">
                  <ul className="py-1 text-sm text-gray-800">
                    <li>
                      <Link href="/account" className="block px-4 py-2 hover:bg-gray-50">Minha conta</Link>
                    </li>
                    <li>
                      <Link href="/favorites" className="block px-4 py-2 hover:bg-gray-50">Favoritos</Link>
                    </li>
                    <li>
                      <Link href="/saved-searches" className="block px-4 py-2 hover:bg-gray-50">Buscas salvas</Link>
                    </li>
                    <li><hr className="my-1" /></li>
                    <li>
                      <button onClick={() => signOut()} className="w-full text-left px-4 py-2 hover:bg-gray-50">Sair</button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => signIn()} className="px-4 py-2 rounded-full border border-gray-300 text-sm text-gray-800 hover:bg-gray-50">Log in</button>
          )}
        </div>
      </div>
      {/* Mobile Sheets */}
      <AnimatePresence>
        {leftOpen && (
          <>
            <motion.div
              key="left-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-[11990]"
              onClick={() => setLeftOpen(false)}
            />
            <motion.aside
              key="left-sheet"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="md:hidden fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-[12000] shadow-xl overflow-y-auto"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Explorar</h2>
                <button onClick={() => setLeftOpen(false)} className="p-2">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="py-2">
                <button onClick={() => setExpanded(expanded === 'buy' ? null : 'buy')} className="w-full flex items-center justify-between px-5 py-4 text-left border-b">
                  <span className="text-lg font-semibold text-gray-900">Comprar</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expanded === 'buy' ? 'rotate-180' : ''}`} />
                </button>
                {expanded === 'buy' && (
                  <div className="bg-gray-50 py-2">
                    <Link href="/?type=HOUSE" onClick={() => setLeftOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">Casas</Link>
                    <Link href="/?type=APARTMENT" onClick={() => setLeftOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">Apartamentos</Link>
                    <Link href="/?type=CONDO" onClick={() => setLeftOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">Condomínios</Link>
                    <Link href="/?type=LAND" onClick={() => setLeftOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">Terrenos</Link>
                  </div>
                )}

                <button onClick={() => setExpanded(expanded === 'rent' ? null : 'rent')} className="w-full flex items-center justify-between px-5 py-4 text-left border-b">
                  <span className="text-lg font-semibold text-gray-900">Alugar</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expanded === 'rent' ? 'rotate-180' : ''}`} />
                </button>
                {expanded === 'rent' && (
                  <div className="bg-gray-50 py-2">
                    <Link href="/?status=RENT&type=HOUSE" onClick={() => setLeftOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">Casas para alugar</Link>
                    <Link href="/?status=RENT&type=APARTMENT" onClick={() => setLeftOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">Apartamentos</Link>
                    <Link href="/calculadora-aluguel" onClick={() => setLeftOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">Calculadora</Link>
                  </div>
                )}

                <button onClick={() => setExpanded(expanded === 'sell' ? null : 'sell')} className="w-full flex items-center justify-between px-5 py-4 text-left border-b">
                  <span className="text-lg font-semibold text-gray-900">Vender</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expanded === 'sell' ? 'rotate-180' : ''}`} />
                </button>
                {expanded === 'sell' && (
                  <div className="bg-gray-50 py-2">
                    <Link href="/owner/new" onClick={() => setLeftOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">Anunciar imóvel</Link>
                    {session && role === 'OWNER' && (
                      <>
                        <Link href="/owner/properties" onClick={() => setLeftOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">Meus anúncios</Link>
                        <Link href="/owner/leads" onClick={() => setLeftOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">Meus leads</Link>
                      </>
                    )}
                  </div>
                )}

                <Link href="/calculadora" onClick={() => setLeftOpen(false)} className="block px-5 py-4 text-lg font-semibold text-gray-900 border-b">Calculadora de financiamento</Link>
                <Link href="/realtor" onClick={() => setLeftOpen(false)} className="block px-5 py-4 text-lg font-semibold text-gray-900 border-b">Encontrar corretor</Link>
                <Link href="/ajuda" onClick={() => setLeftOpen(false)} className="block px-5 py-4 text-lg font-semibold text-gray-900 border-b">Ajuda</Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rightOpen && (
          <>
            <motion.div
              key="right-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-[11990]"
              onClick={() => setRightOpen(false)}
            />
            <motion.aside
              key="right-sheet"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="md:hidden fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white z-[12000] shadow-xl overflow-y-auto"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Minha conta</h2>
                <button onClick={() => setRightOpen(false)} className="p-2">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="py-2">
                {session ? (
                  <>
                    <Link href="/favorites" onClick={() => setRightOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">Favoritos</Link>
                    <Link href="/saved-searches" onClick={() => setRightOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">Buscas salvas</Link>
                    {role === 'OWNER' && (
                      <>
                        <Link href="/owner/properties" onClick={() => setRightOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">Meus anúncios</Link>
                        <Link href="/owner/leads" onClick={() => setRightOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">Meus leads</Link>
                      </>
                    )}
                    {(role === 'REALTOR' || role === 'AGENCY') && (
                      <Link href="/broker/leads" onClick={() => setRightOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">Leads</Link>
                    )}
                    {role === 'ADMIN' && (
                      <>
                        <Link href="/admin" onClick={() => setRightOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">Painel Admin</Link>
                        <Link href="/admin/properties" onClick={() => setRightOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">Gerenciar imóveis</Link>
                        <Link href="/admin/users" onClick={() => setRightOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">Usuários</Link>
                      </>
                    )}
                    <Link href="/account" onClick={() => setRightOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">Minha conta</Link>
                    <button
                      onClick={() => { setRightOpen(false); signOut({ callbackUrl: '/' }); }}
                      className="w-full text-left px-6 py-4 text-lg font-semibold text-gray-900 border-b"
                    >
                      Sair
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setRightOpen(false); signIn(); }} className="w-full text-left px-6 py-4 text-lg font-semibold text-teal-600">Entrar / Criar conta</button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
