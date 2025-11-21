"use client";

import { motion, useScroll, AnimatePresence } from "framer-motion";
import { Menu, X, User, Heart, Bell, LogOut, ChevronDown, LayoutDashboard, Building2, ClipboardList, Users, Wrench, LineChart, Megaphone, Star, Settings, Bookmark, Home, HelpCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import MobileHeaderZillow from "./MobileHeaderZillow";
import HowItWorksModal from "./HowItWorksModal";

interface ModernNavbarProps {
  forceLight?: boolean;
}

export default function ModernNavbar({ forceLight = false }: ModernNavbarProps = {}) {
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [primary, setPrimary] = useState<"comprar" | "alugar" | "anunciar">("comprar");
  const navRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<"comprar" | "alugar" | "recursos" | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const { scrollY } = useScroll();
  const pathname = usePathname();
  
  const role = (session as any)?.user?.role || "USER";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  
  // Mantém sempre estilo JamesEdition (sem transformação ao rolar)

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
      const target = e.target as Node;
      if (navRef.current && !navRef.current.contains(target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buyMenuItems = [
    { label: "Casas à venda", href: "/?type=HOUSE" },
    { label: "Apartamentos à venda", href: "/?type=APARTMENT" },
    { label: "Condomínios", href: "/?type=CONDO" },
    { label: "Terrenos", href: "/?type=LAND" },
    { label: "Comercial", href: "/?type=COMMERCIAL" },
    { label: "Todos os imóveis", href: "/" },
  ];

  const rentMenuItems = [
    { label: "Casas para alugar", href: "/?status=RENT&type=HOUSE" },
    { label: "Apartamentos para alugar", href: "/?status=RENT&type=APARTMENT" },
    { label: "Condomínios", href: "/?status=RENT&type=CONDO" },
    { label: "Studios", href: "/?status=RENT&type=STUDIO" },
    { label: "Todos para alugar", href: "/?status=RENT" },
  ];

  const resourceSections = [
    {
      title: "Comprar",
      items: [
        { label: "Guia do comprador", href: "/guia/compra" },
        { label: "Financiamento", href: "/financing" },
        { label: "Novos imóveis", href: "/?sort=recent" },
        { label: "Menor preço", href: "/?sort=price_asc" },
        { label: "Calculadora de financiamento", href: "/calculadora" },
      ],
    },
    {
      title: "Alugar",
      items: [
        { label: "Guia do inquilino", href: "/guia/locacao" },
        { label: "Novos anúncios", href: "/?status=RENT&sort=recent" },
        { label: "Menor aluguel", href: "/?status=RENT&sort=price_asc" },
        { label: "Calculadora de aluguel", href: "/calculadora-aluguel" },
      ],
    },
    {
      title: "Vender",
      items: [
        { label: "Guia do vendedor", href: "/guia/venda" },
        { label: "Análise de mercado", href: "/owner/analytics" },
        { label: "Dicas para vender", href: "/dicas/venda" },
        { label: "Estimar valor do imóvel", href: "/estimador" },
        { label: "Comparar preços", href: "/comparador" },
        { label: "Contratar fotógrafo", href: "/fotografo" },
      ],
    },
    {
      title: "Ferramentas gerais",
      items: [
        { label: "Buscas salvas", href: "/saved-searches" },
        { label: "Meus favoritos", href: "/favorites" },
      ],
    },
  ];

  const isDashboardContext = pathname?.startsWith("/admin") || pathname?.startsWith("/owner") || pathname?.startsWith("/broker");

  return (
    <>
      {/* Mobile Header - Zillow Style */}
      <MobileHeaderZillow />

      {/* Desktop Navigation - JamesEdition style on home, solid on dashboards */}
      <motion.nav
        ref={navRef}
        className={`hidden md:block w-full relative z-[200] transition-all duration-300 ${
          isDashboardContext
            ? "bg-gradient-to-r from-teal-light to-teal shadow-md"
            : forceLight
            ? "bg-white shadow-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-3 items-center h-16">
            {/* Left: Primary tabs with dropdowns (Desktop) */}
            <div className="flex items-center justify-start gap-7">
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-7">
              {/* Comprar */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === "comprar" ? null : "comprar")}
                  className={`flex items-center gap-1 font-semibold text-[15px] transition-colors relative group ${
                    forceLight
                      ? (primary === 'comprar' ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900')
                      : (primary === 'comprar' ? 'text-white' : 'text-white/90 hover:text-white')
                  }`}
                >
                  <span>Comprar</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openMenu === 'comprar' ? 'rotate-180' : ''}`} />
                  <span className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
                    forceLight ? 'bg-teal-600' : 'bg-white'
                  } ${
                    primary === 'comprar' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </button>
                {openMenu === "comprar" && (
                  <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-gray-200 py-2 z-[300]">
                    {buyMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-teal-700"
                        onClick={() => { setOpenMenu(null); setPrimary('comprar'); }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Alugar */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === "alugar" ? null : "alugar")}
                  className={`flex items-center gap-1 font-semibold text-[15px] transition-colors relative group ${
                    forceLight
                      ? (primary === 'alugar' ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900')
                      : (primary === 'alugar' ? 'text-white' : 'text-white/90 hover:text-white')
                  }`}
                >
                  <span>Alugar</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openMenu === 'alugar' ? 'rotate-180' : ''}`} />
                  <span className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
                    forceLight ? 'bg-teal-600' : 'bg-white'
                  } ${
                    primary === 'alugar' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </button>
                {openMenu === "alugar" && (
                  <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-gray-200 py-2 z-[300]">
                    {rentMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-teal-700"
                        onClick={() => { setOpenMenu(null); setPrimary('alugar'); }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Anunciar imóvel - link direto */}
              <Link
                href="/owner/new"
                className={`font-semibold text-[15px] transition-colors relative group ${
                  forceLight
                    ? (primary === 'anunciar' ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900')
                    : (primary === 'anunciar' ? 'text-white' : 'text-white/90 hover:text-white')
                }`}
                onClick={() => setPrimary('anunciar')}
              >
                Anunciar imóvel
                <span className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
                  forceLight ? 'bg-teal-600' : 'bg-white'
                } ${
                  primary === 'anunciar' ? 'w-full' : 'w-0 group-hover:w-full'
                }`} />
              </Link>
            </div>
          </div>

          {/* Center: Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl transition-colors ${
                forceLight ? 'bg-teal-600 text-white' : 'bg-white/20 backdrop-blur text-white'
              }`}>
                Z
              </div>
              <span className={`hidden lg:block text-xl font-bold transition-colors ${
                forceLight ? 'text-gray-900' : 'text-white'
              }`}>ZillowLike</span>
            </Link>
          </div>
          
          {/* Right: Context links (3) + account */}
          <div className="flex items-center justify-end gap-2">
            <div className="relative hidden lg:block">
              <button 
                type="button"
                onClick={() => setOpenMenu(openMenu === "recursos" ? null : "recursos")} 
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  forceLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Recursos</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openMenu === 'recursos' ? 'rotate-180' : ''}`} />
              </button>
              {openMenu === "recursos" && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-xl border border-gray-200 py-3 z-[300]">
                  {resourceSections.map((section) => (
                    <div key={section.title} className="px-3 pb-2 mb-2 last:mb-0 last:border-b-0 border-b border-gray-100">
                      <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        {section.title}
                      </div>
                      <ul className="space-y-0.5">
                        {section.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className="block px-2 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-teal-700"
                              onClick={() => setOpenMenu(null)}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Link 
              href="/favorites" 
              className={`p-2 rounded-lg transition-colors ${
                forceLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
            >
              <Heart className="w-5 h-5" />
            </Link>
            {session ? (
              <div className="relative" id="user-menu-trigger">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/10`}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-medium text-sm">
                    {session.user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </button>
                {userMenuOpen && (
                  <div id="user-menu-dropdown" className="absolute left-0 mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-xl z-[20000]">
                    <ul className="py-1 text-sm text-gray-800">
                      {role === 'OWNER' && (
                        <>
                          <li><Link href="/owner/dashboard" className="block px-4 py-2 hover:bg-gray-50">Dashboard</Link></li>
                          <li><Link href="/owner/properties" className="block px-4 py-2 hover:bg-gray-50">Meus anúncios</Link></li>
                          <li><Link href="/owner/leads" className="block px-4 py-2 hover:bg-gray-50">Meus leads</Link></li>
                          <li><hr className="my-1" /></li>
                        </>
                      )}
                      {(role === 'REALTOR' || role === 'AGENCY') && (
                        <>
                          <li><Link href="/broker/dashboard" className="block px-4 py-2 hover:bg-gray-50">Painel</Link></li>
                          <li><Link href="/broker/leads" className="block px-4 py-2 hover:bg-gray-50">Leads</Link></li>
                          <li><Link href="/broker/properties" className="block px-4 py-2 hover:bg-gray-50">Imóveis</Link></li>
                          <li><hr className="my-1" /></li>
                        </>
                      )}
                      {role === 'ADMIN' && (
                        <>
                          <li><Link href="/admin" className="block px-4 py-2 hover:bg-gray-50">Painel Admin</Link></li>
                          <li><Link href="/admin/properties" className="block px-4 py-2 hover:bg-gray-50">Gerenciar imóveis</Link></li>
                          <li><Link href="/admin/users" className="block px-4 py-2 hover:bg-gray-50">Usuários</Link></li>
                          <li><hr className="my-1" /></li>
                        </>
                      )}
                      <li><Link href="/account" className="block px-4 py-2 hover:bg-gray-50">Minha conta</Link></li>
                      <li><Link href="/favorites" className="block px-4 py-2 hover:bg-gray-50">Favoritos</Link></li>
                      <li><Link href="/saved-searches" className="block px-4 py-2 hover:bg-gray-50">Buscas salvas</Link></li>
                      <li><hr className="my-1" /></li>
                      <li><button onClick={() => signOut()} className="w-full text-left px-4 py-2 hover:bg-gray-50">Sair</button></li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm bg-white/20 backdrop-blur text-white hover:bg-white/30`}
              >
                Entrar
              </button>
            )}
          </div>

          {/* Mobile Menu Button (duplicated copy removed; controlled on the left) */}
          </div>
        </div>

      </motion.nav>

      {/* How It Works Modal */}
      <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </>
  );
}
