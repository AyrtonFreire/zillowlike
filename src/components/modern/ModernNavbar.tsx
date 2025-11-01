"use client";

import { motion, useScroll, AnimatePresence } from "framer-motion";
import { Menu, X, User, Heart, Bell, LogOut, ChevronDown, LayoutDashboard, Building2, ClipboardList, Users, Wrench, LineChart, Megaphone, Star, Settings, Bookmark, Home } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileHeaderZillow from "./MobileHeaderZillow";

export default function ModernNavbar() {
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [megaMenu, setMegaMenu] = useState<"comprar" | "alugar" | "anunciar" | null>(null);
  const [primary, setPrimary] = useState<"comprar" | "alugar" | "anunciar">("comprar");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const { scrollY } = useScroll();
  
  const role = (session as any)?.user?.role || "USER";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Transparente na home/topo e sólido ao rolar

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const onDoc = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (!t.closest('#user-menu-trigger') && !t.closest('#user-menu-dropdown')) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserMenuOpen(false); };
    document.addEventListener('mousedown', onDoc as EventListener, true);
    document.addEventListener('touchstart', onDoc as EventListener, true);
    document.addEventListener('keydown', onKey as EventListener, true);
    return () => {
      document.removeEventListener('mousedown', onDoc as EventListener, true);
      document.removeEventListener('touchstart', onDoc as EventListener, true);
      document.removeEventListener('keydown', onKey as EventListener, true);
    };
  }, []);

  // Close mega menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mega-menu-container')) {
        setMegaMenu(null);
      }
    };
    if (megaMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [megaMenu]);

  const menuItems = [
    { label: "Comprar", key: "comprar" as const },
    { label: "Alugar", key: "alugar" as const },
    { label: "Anunciar imóvel", key: "anunciar" as const },
  ];

  return (
    <>
      {/* Mobile Header - Zillow Style */}
      <MobileHeaderZillow />

      {/* Desktop Navigation */}
      <motion.nav
        className={`hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/90 shadow-lg backdrop-blur-lg`}
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className={`grid grid-cols-3 items-center ${isScrolled ? 'h-16' : 'h-20'} transition-[height]`}>
            {/* Left: Primary tabs with mega dropdown triggers (Desktop) */}
            <div className="flex items-center justify-start gap-7">
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-7 mega-menu-container">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => { setMegaMenu(item.key); setPrimary(item.key); }}
                onClick={() => { setMegaMenu(megaMenu === item.key ? null : item.key); setPrimary(item.key); }}
                className={`text-gray-900 hover:text-teal font-semibold text-[15px] transition-colors relative group ${
                  primary === item.key ? 'text-teal' : ''
                }`}
              >
                {item.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-teal transition-all duration-300 ${
                  primary === item.key ? 'w-full' : 'w-0 group-hover:w-full'
                }`} />
              </button>
            ))}
            </div>
          </div>

          {/* Center: Logo */}
          <Link href="/" className="flex items-center gap-2 justify-center">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 bg-teal rounded-lg flex items-center justify-center shadow-md"
            >
              <span className="text-white font-bold text-xl">Z</span>
            </motion.div>
            <span className="text-2xl font-bold text-stone-900">
              ZillowLike
            </span>
          </Link>
          
          {/* Right: Context links (3) + account */}
          <div className="hidden md:flex items-center justify-end gap-3 pr-4">
            {/* Context links vary by primary */}
            {(() => {
              const role = (session as any)?.user?.role || 'USER';
              if (role === 'ADMIN') {
                return [
                  { label: 'Painel admin', href: '/admin' },
                  { label: 'Propriedades', href: '/admin/properties' },
                  { label: 'Usuários', href: '/admin/users' },
                ];
              }
              if (primary === 'comprar') {
                return [
                  { label: 'Financiamento', href: '/calculadora' },
                  { label: 'Encontrar corretor', href: '/realtor' },
                  { label: 'Favoritos', href: '/favorites' },
                ];
              }
              if (primary === 'alugar') {
                return [
                  { label: 'Alertas', href: '/alerts' },
                  { label: 'Buscas salvas', href: '/saved-searches' },
                  { label: 'Favoritos', href: '/favorites' },
                ];
              }
              return [
                { label: 'Anunciar', href: '/owner/new' },
                { label: 'Meus anúncios', href: '/owner/properties' },
                { label: 'Leads', href: '/owner/leads' },
              ];
            })().map((a) => (
              <Link key={a.label} href={a.href} className="text-[15px] font-semibold text-gray-800 hover:text-teal">
                {a.label}
              </Link>
            ))}

            {/* Account actions */}
            {session ? (
              <div className="relative">
                <motion.button
                  id="user-menu-trigger"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-2 px-2 py-1.5 glass-teal text-white rounded-full font-semibold text-[13px] transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </motion.button>
                {userMenuOpen && (
                  <div
                    id="user-menu-dropdown"
                    className="absolute right-0 mt-2 w-80 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden z-50"
                  >
                    {/* Header */}
                    <div className="px-4 py-4 bg-stone-50 border-b">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-teal text-white flex items-center justify-center font-bold shadow-md">
                          {(session as any)?.user?.name?.[0]?.toUpperCase?.() || (session as any)?.user?.email?.[0]?.toUpperCase?.() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{(session as any)?.user?.name || (session as any)?.user?.email || 'Conta'}</div>
                          <div className="text-[11px] text-gray-600 truncate">{(session as any)?.user?.email}</div>
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-white text-gray-700">{role}</span>
                        </div>
                      </div>
                    </div>
                    {/* Body */}
                    <div className="py-2">
                      {role === 'ADMIN' && (
                        <>
                          <div className="px-4 pb-1 text-[11px] uppercase tracking-wider text-teal-light">Administração</div>
                          <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <LayoutDashboard className="w-4 h-4 text-teal"/> Painel Admin
                          </Link>
                          <Link href="/admin/properties" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <Building2 className="w-4 h-4 text-teal"/> Gerenciar imóveis
                          </Link>
                          <Link href="/admin/users" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <Users className="w-4 h-4 text-teal"/> Usuários
                          </Link>
                          <Link href="/admin/realtor-applications" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <ClipboardList className="w-4 h-4 text-teal"/> Aplicações de corretores
                          </Link>
                          <div className="my-2 border-t" />
                        </>
                      )}
                      {role === 'OWNER' && (
                        <>
                          <div className="px-4 pb-1 text-[11px] uppercase tracking-wider text-teal-light">Proprietário</div>
                          <Link href="/owner/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <LayoutDashboard className="w-4 h-4 text-teal"/> Painel do proprietário
                          </Link>
                          <Link href="/owner/new" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <Megaphone className="w-4 h-4 text-teal"/> Anunciar imóvel
                          </Link>
                          <Link href="/owner/properties" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <Building2 className="w-4 h-4 text-teal"/> Meus anúncios
                          </Link>
                          <Link href="/owner/leads" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <ClipboardList className="w-4 h-4 text-teal"/> Meus leads
                          </Link>
                          <Link href="/owner/analytics" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <LineChart className="w-4 h-4 text-teal"/> Analytics
                          </Link>
                          <div className="my-2 border-t" />
                        </>
                      )}
                      {(role === 'REALTOR' || role === 'AGENCY') && (
                        <>
                          <div className="px-4 pb-1 text-[11px] uppercase tracking-wider text-teal-light">{role === 'AGENCY' ? 'Imobiliária' : 'Corretor'}</div>
                          <Link href="/realtor" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <LayoutDashboard className="w-4 h-4 text-teal"/> {role === 'AGENCY' ? 'Painel da imobiliária' : 'Painel do corretor'}
                          </Link>
                          <Link href="/alerts" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <Bell className="w-4 h-4 text-teal"/> Alertas
                          </Link>
                          <Link href="/owner/new" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <Megaphone className="w-4 h-4 text-teal"/> Anunciar imóvel
                          </Link>
                          <Link href="/owner/properties" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <Building2 className="w-4 h-4 text-teal"/> {role === 'AGENCY' ? 'Anúncios da imobiliária' : 'Meus anúncios'}
                          </Link>
                          <div className="my-2 border-t" />
                        </>
                      )}
                      {role === 'USER' && (
                        <>
                          <div className="px-4 pb-1 text-[11px] uppercase tracking-wider text-teal-light">Começar</div>
                          <Link href="/owner/new" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5">
                            <Megaphone className="w-4 h-4 text-teal"/> Anunciar imóvel
                          </Link>
                          <div className="my-2 border-t" />
                        </>
                      )}
                      <div className="px-4 pb-1 text-[11px] uppercase tracking-wider text-teal-light">Conta</div>
                      <Link href="/favorites" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5"><Star className="w-4 h-4 text-teal"/> Favoritos</Link>
                      <Link href="/saved-searches" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5"><Bookmark className="w-4 h-4 text-teal"/> Buscas salvas</Link>
                      <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-gray-800 hover:bg-teal/5"><Settings className="w-4 h-4 text-teal"/> Perfil e conta</Link>
                    </div>
                    <div className="border-t">
                      <button onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: "/" }); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-semibold">Sair</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => signIn()}
                className="flex items-center gap-2 px-4 py-2 glass-teal text-white rounded-full font-semibold transition-all"
              >
                <User className="w-4 h-4" />
                Entrar
              </motion.button>
            )}
          </div>

          {/* Mobile Menu Button (duplicated copy removed; controlled on the left) */}
        </div>
      </div>

      {/* Mega Menu Dropdown */}
      {megaMenu && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-2xl mega-menu-container"
          onMouseLeave={() => setMegaMenu(null)}
        >
          <div className="container mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {megaMenu === "comprar" && (
                <>
                  <MegaMenuSection
                    title="Imóveis à venda"
                    icon="🏠"
                    items={[
                      { label: "Casas à venda", href: "/?type=HOUSE" },
                      { label: "Apartamentos à venda", href: "/?type=APARTMENT" },
                      { label: "Condomínios", href: "/?type=CONDO" },
                      { label: "Terrenos", href: "/?type=LAND" },
                      { label: "Comercial", href: "/?type=COMMERCIAL" },
                      { label: "Todos os imóveis", href: "/" },
                    ]}
                  />
                  <MegaMenuSection
                    title="Recursos"
                    icon="⚡"
                    items={[
                      { label: "Novos imóveis", href: "/?sort=recent" },
                      { label: "Menor preço", href: "/?sort=price_asc" },
                      { label: "Financiamento", href: "/financing" },
                      { label: "Guia do comprador", href: "/guia/compra" },
                    ]}
                  />
                  <MegaMenuSection
                    title="Ferramentas"
                    icon="🔧"
                    items={[
                      { label: "Calculadora de financiamento", href: "/calculadora" },
                      { label: "Buscas salvas", href: "/saved-searches" },
                      { label: "Meus favoritos", href: "/favorites" },
                    ]}
                  />
                </>
              )}
              {megaMenu === "alugar" && (
                <>
                  <MegaMenuSection
                    title="Imóveis para alugar"
                    icon="🔑"
                    items={[
                      { label: "Casas para alugar", href: "/?status=RENT&type=HOUSE" },
                      { label: "Apartamentos para alugar", href: "/?status=RENT&type=APARTMENT" },
                      { label: "Condomínios", href: "/?status=RENT&type=CONDO" },
                      { label: "Studios", href: "/?status=RENT&type=STUDIO" },
                      { label: "Todos para alugar", href: "/?status=RENT" },
                    ]}
                  />
                  <MegaMenuSection
                    title="Recursos"
                    icon="📋"
                    items={[
                      { label: "Novos anúncios", href: "/?status=RENT&sort=recent" },
                      { label: "Menor aluguel", href: "/?status=RENT&sort=price_asc" },
                      { label: "Guia do inquilino", href: "/guia/locacao" },
                    ]}
                  />
                  <MegaMenuSection
                    title="Ferramentas"
                    icon="💰"
                    items={[
                      { label: "Calculadora de aluguel", href: "/calculadora-aluguel" },
                      { label: "Buscas salvas", href: "/saved-searches" },
                      { label: "Meus favoritos", href: "/favorites" },
                    ]}
                  />
                </>
              )}
              {megaMenu === "anunciar" && (
                <>
                  <MegaMenuSection
                    title="Anunciar seu imóvel"
                    icon="🏡"
                    items={[
                      { label: "Anunciar imóvel grátis", href: "/owner/new" },
                      { label: "Meus anúncios", href: "/owner/properties" },
                      { label: "Painel do proprietário", href: "/owner/dashboard" },
                      { label: "Meus leads", href: "/owner/leads" },
                    ]}
                  />
                  <MegaMenuSection
                    title="Recursos"
                    icon="📊"
                    items={[
                      { label: "Guia do vendedor", href: "/guia/venda" },
                      { label: "Análise de mercado", href: "/owner/analytics" },
                      { label: "Dicas para vender", href: "/dicas/venda" },
                    ]}
                  />
                  <MegaMenuSection
                    title="Ferramentas"
                    icon="🛠️"
                    items={[
                      { label: "Estimar valor do imóvel", href: "/estimador" },
                      { label: "Comparar preços", href: "/comparador" },
                      { label: "Contratar fotógrafo", href: "/fotografo" },
                    ]}
                  />
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      </motion.nav>
    </>
  );
}

// Mega Menu Section Component
function MegaMenuSection({ title, icon, items }: { title: string; icon: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index}>
            <Link
              href={item.href}
              className="block px-4 py-2 text-gray-700 hover:text-teal hover:bg-teal/5 rounded-lg transition-all font-medium"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
