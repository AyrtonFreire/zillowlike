"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function TopNavMega() {
  const [open, setOpen] = useState<null | "comprar" | "alugar" | "vender">(null);
  const { data: session, status, update } = useSession();
  const user = (session as any)?.user || null;
  // CRITICAL: Read role from session.user.role (set by session callback)
  const role = (session as any)?.user?.role || "USER";
  const [stickyShadow, setStickyShadow] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  
  // FORCE session refresh on mount to get latest data from server
  useEffect(() => {
    if (status === "authenticated") {
      update();
    }
  }, []); // Only on mount
  
  // Debug: log role
  if (user) {
    console.log("TopNavMega - User:", user.email, "Role:", role);
  }
  const closeTimer = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [anim, setAnim] = useState<'in'|'out'|'idle'>('idle');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(null); setUserMenuOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    function onScroll() {
      setStickyShadow(window.scrollY > 4 || !!open);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

  // Handle open/close animations and initial focus
  useEffect(() => {
    if (open) {
      setAnim('in');
      // focus first item after paint
      setTimeout(() => {
        const first = menuRef.current?.querySelector<HTMLAnchorElement>('a[href]');
        first?.focus({ preventScroll: true });
      }, 30);
    } else if (anim !== 'idle') {
      setAnim('out');
      const t = setTimeout(() => setAnim('idle'), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keyboard navigation within menu (arrows, Home/End, Tab wrap)
  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowDown','ArrowUp','Home','End','Tab'];
    if (!keys.includes(e.key)) return;
    const links = Array.from(menuRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') || []);
    if (!links.length) return;
    const active = document.activeElement as HTMLElement | null;
    let idx = Math.max(0, links.findIndex((el) => el === active));
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % links.length; links[idx].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + links.length) % links.length; links[idx].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); links[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); links[links.length - 1].focus(); }
    else if (e.key === 'Tab') {
      // cycle focus
      e.preventDefault();
      if (!e.shiftKey) { idx = (idx + 1) % links.length; } else { idx = (idx - 1 + links.length) % links.length; }
      links[idx].focus();
    }
  }

  return (
    <header className={`bg-white/95 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40 transition-all duration-300 ${stickyShadow ? 'shadow-lg border-gray-300/40' : ''}`}
      onMouseEnter={()=> { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } }}
      onMouseLeave={()=> { if (open) closeTimer.current = setTimeout(()=> setOpen(null), 120); }}
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        {/* Navigation Bar */}
        <div className="h-16 flex items-center justify-between">
          {/* Left Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <button 
              type="button"
              onMouseEnter={()=>{clearTimeout(closeTimer.current!); setOpen("comprar");}} 
              onFocus={()=>setOpen("comprar")}
              onClick={()=>setOpen(open === "comprar" ? null : "comprar")}
              className={`btn btn-ghost px-4 py-2 text-sm font-medium transition-all focus-ring rounded-lg ${
                open === "comprar" ? "text-primary-600 bg-primary-50" : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
              }`}
            >
              Comprar
            </button>
            <button 
              type="button"
              onMouseEnter={()=>{clearTimeout(closeTimer.current!); setOpen("alugar");}} 
              onFocus={()=>setOpen("alugar")}
              onClick={()=>setOpen(open === "alugar" ? null : "alugar")}
              className={`btn btn-ghost px-4 py-2 text-sm font-medium transition-all focus-ring rounded-lg ${
                open === "alugar" ? "text-primary-600 bg-primary-50" : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
              }`}
            >
              Alugar
            </button>
            <button 
              type="button"
              onMouseEnter={()=>{clearTimeout(closeTimer.current!); setOpen("vender");}} 
              onFocus={()=>setOpen("vender")}
              onClick={()=>setOpen(open === "vender" ? null : "vender")}
              className={`btn btn-ghost px-4 py-2 text-sm font-medium transition-all focus-ring rounded-lg ${
                open === "vender" ? "text-primary-600 bg-primary-50" : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
              }`}
            >
              Vender
            </button>
            <Link href="/financing" className="btn btn-ghost px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-all">
              Financiar
            </Link>
          </nav>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="hidden sm:block text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
              Zillowlike
            </span>
          </Link>

          {/* Right Navigation */}
          <div className="flex items-center gap-2">
            {/* Dashboard Dropdown - Based on Role */}
            {user && (
              <div className="relative hidden lg:block" ref={userMenuRef}>
                <button
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-glass-teal to-glass-teal shadow hover:shadow-md transition-all ${userMenuOpen ? 'ring-2 ring-glass-teal' : ''}`}
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Dashboard
                  <svg className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
                </button>
                {userMenuOpen && (
                  <div
                    role="menu"
                    tabIndex={-1}
                    className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Acessos rápidos</div>
                    </div>
                    <div className="p-2 grid grid-cols-1">
                      {quickLinksByRole(role).map((item) => (
                        <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-glass-teal" onClick={()=> setUserMenuOpen(false)}>
                          <span className="shrink-0">{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Favoritos - Visível apenas quando logado */}
            {user && (
              <Link 
                href="/favorites" 
                className="hidden lg:inline-flex items-center gap-2 btn btn-ghost px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Meus Favoritos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden xl:inline">Favoritos</span>
              </Link>
            )}
            
            <Link href="/start" className="hidden lg:inline-flex btn btn-ghost px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-all">
              Anunciar
            </Link>
            
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="hidden md:block text-sm text-gray-600">Olá, {user.name?.split(' ')[0]}</span>
                <button 
                  onClick={() => signOut({ callbackUrl: '/' })} 
                  className="btn btn-secondary text-sm px-4 py-2"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button 
                onClick={()=> signIn('google', { callbackUrl: '/' })} 
                className="btn btn-primary text-sm px-6 py-2"
              >
                Entrar
              </button>
            )}

            {/* Mobile Menu Button */}
            <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* Mega menu */}
      <div className="relative">
        {open && (
          <>
          {/* overlay click-outside */}
          <button aria-label="Fechar menu" className="fixed inset-0 z-[1000] bg-transparent" onClick={()=> setOpen(null)} />
          <div
            ref={menuRef}
            onKeyDown={onMenuKeyDown}
            role="menu"
            aria-label="Menu principal"
            className={`absolute inset-x-0 z-[1010] bg-gradient-to-b from-white to-gray-50/95 backdrop-blur-xl border-t border-gray-200 shadow-2xl transition-all duration-200 ${anim==='in' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
          >
            <div className="mx-auto max-w-7xl px-6 py-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {open === "comprar" && (
                  <>
                    <Section title="Imóveis à venda" icon={
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    }>
                      <Item href="/?type=HOUSE">Casas à venda</Item>
                      <Item href="/?type=APARTMENT">Apartamentos à venda</Item>
                      <Item href="/?type=CONDO">Condomínios</Item>
                      <Item href="/?type=LAND">Terrenos</Item>
                      <Item href="/?type=COMMERCIAL">Comercial</Item>
                      <Item href="/">Todos os imóveis</Item>
                    </Section>
                    <Divider />
                    <Section title="Recursos" icon={
                      <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    }>
                      <Item href="/?sort=recent">Novos imóveis</Item>
                      <Item href="/?sort=price_asc">Menor preço</Item>
                      <Item href="/financing">Financiamento</Item>
                      <Item href="/guia/compra">Guia do comprador</Item>
                    </Section>
                    <Divider />
                    <Section title="Ferramentas" icon={
                      <svg className="w-5 h-5 text-glass-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    }>
                      <Item href="/calculadora">Calculadora de financiamento</Item>
                      <Item href="/saved-searches">Buscas salvas</Item>
                      <Item href="/favorites">Meus favoritos</Item>
                    </Section>
                  </>
                )}
                {open === "alugar" && (
                  <>
                    <Section title="Imóveis para alugar" icon={
                      <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    }>
                      <Item href="/?status=RENT&type=HOUSE">Casas para alugar</Item>
                      <Item href="/?status=RENT&type=APARTMENT">Apartamentos para alugar</Item>
                      <Item href="/?status=RENT&type=CONDO">Condomínios</Item>
                      <Item href="/?status=RENT&type=STUDIO">Studios</Item>
                      <Item href="/?status=RENT">Todos para alugar</Item>
                    </Section>
                    <Divider />
                    <Section title="Recursos" icon={
                      <svg className="w-5 h-5 text-glass-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }>
                      <Item href="/?status=RENT&sort=recent">Novos anúncios</Item>
                      <Item href="/?status=RENT&sort=price_asc">Menor aluguel</Item>
                      <Item href="/guia/locacao">Guia do inquilino</Item>
                    </Section>
                    <Divider />
                    <Section title="Ferramentas" icon={
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }>
                      <Item href="/calculadora-aluguel">Calculadora de aluguel</Item>
                      <Item href="/saved-searches">Buscas salvas</Item>
                      <Item href="/favorites">Meus favoritos</Item>
                    </Section>
                  </>
                )}
                {open === "vender" && (
                  <>
                    <Section title="Vender seu imóvel" icon={
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    }>
                      <Item href="/start">Anunciar imóvel grátis</Item>
                      <Item href="/owner/properties">Meus anúncios</Item>
                      <Item href="/owner/dashboard">Painel do proprietário</Item>
                      <Item href="/owner/leads">Meus leads</Item>
                    </Section>
                    <Divider />
                    <Section title="Recursos" icon={
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }>
                      <Item href="/guia/venda">Guia do vendedor</Item>
                      <Item href="/owner/analytics">Análise de mercado</Item>
                      <Item href="/dicas/venda">Dicas para vender</Item>
                    </Section>
                    <Divider />
                    <Section title="Ferramentas" icon={
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    }>
                      <Item href="/estimador">Estimar valor do imóvel</Item>
                      <Item href="/comparador">Comparar preços</Item>
                      <Item href="/fotografo">Contratar fotógrafo</Item>
                    </Section>
                  </>
                )}
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </header>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <div className="flex items-center gap-3 text-gray-900 font-bold mb-5">
        {icon && <span className="flex-shrink-0 p-2 bg-primary-50 rounded-lg">{icon}</span>}
        <span className="text-lg">{title}</span>
      </div>
      <ul className="space-y-1 text-gray-700">
        {children}
      </ul>
    </div>
  );
}

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between w-full rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-primary-100/50 hover:text-primary-700 hover:shadow-sm transition-all duration-200 hover:translate-x-1"
      >
        <span>{children}</span>
        <svg className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </li>
  );
}

function Divider() {
  return <div className="hidden lg:block border-l border-gray-200/80" aria-hidden />;
}

type QuickItem = { href: string; label: string; icon: React.ReactNode };
function quickLinksByRole(role: string): QuickItem[] {
  const ico = (path: string) => (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
  if (role === "ADMIN") {
    return [
      { href: "/admin", label: "Dashboard Admin", icon: ico("M3 3h18v4H3zM3 9h18v12H3z") },
      { href: "/admin/properties", label: "Gerir imóveis", icon: ico("M4 6h16M4 10h16M4 14h10") },
      { href: "/admin/users", label: "Gerir usuários", icon: ico("M5 8a4 4 0 118 0 4 4 0 01-8 0z M3 20a6 6 0 1112 0H3z") },
      { href: "/admin/logs", label: "Logs", icon: ico("M4 4h16v16H4z") },
    ];
  }
  if (role === "REALTOR") {
    return [
      { href: "/broker/dashboard", label: "Painel do corretor", icon: ico("M3 12l2-2 7-7 7 7-2 2v7a1 1 0 01-1 1H6a1 1 0 01-1-1v-7z") },
      { href: "/broker/leads", label: "Meus leads", icon: ico("M16 12a4 4 0 10-8 0 4 4 0 008 0z M12 14v7") },
      { href: "/saved-searches", label: "Buscas salvas", icon: ico("M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z") },
      { href: "/favorites", label: "Favoritos", icon: ico("M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364 4.318 12.682z") },
    ];
  }
  if (role === "OWNER") {
    return [
      { href: "/owner/dashboard", label: "Painel do proprietário", icon: ico("M3 12l2-2 7-7 7 7-2 2v7a1 1 0 01-1 1H6a1 1 0 01-1-1v-7z") },
      { href: "/owner/new", label: "Cadastrar novo imóvel", icon: ico("M12 4v16m8-8H4") },
      { href: "/owner/properties", label: "Meus anúncios", icon: ico("M4 6h16M4 10h16M4 14h10") },
      { href: "/owner/leads", label: "Leads recebidos", icon: ico("M16 12a4 4 0 10-8 0 4 4 0 008 0z M12 14v7") },
    ];
  }
  // USER (default)
  return [
    { href: "/favorites", label: "Favoritos", icon: ico("M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364 4.318 12.682z") },
    { href: "/saved-searches", label: "Buscas salvas", icon: ico("M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z") },
    { href: "/start", label: "Anunciar imóvel", icon: ico("M12 4v16m8-8H4") },
    { href: "/dashboard", label: "Meu painel", icon: ico("M4 4h16v16H4z") },
  ];
}
