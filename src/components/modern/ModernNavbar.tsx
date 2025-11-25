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
  const [primary, setPrimary] = useState<"comprar" | "alugar" | "anunciar" | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<"comprar" | "alugar" | "recursos" | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const { scrollY } = useScroll();
  const pathname = usePathname();
  
  const role = (session as any)?.user?.role || "USER";
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
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

  // Inbox de mensagens internas para corretores - verifica se há conversas não lidas
  useEffect(() => {
    if (!session) return;
    if (role !== 'REALTOR' && role !== 'AGENCY' && role !== 'ADMIN') return;

    let cancelled = false;

    const STORAGE_PREFIX = 'zlw_inbox_last_read_';

    const updateUnread = async () => {
      try {
        const response = await fetch('/api/broker/messages/inbox');
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success || !Array.isArray(data.conversations)) {
          if (!cancelled) setHasUnreadMessages(false);
          return;
        }

        let anyUnread = false;

        if (typeof window !== 'undefined') {
          for (const conv of data.conversations) {
            const leadId = conv.leadId as string;
            const key = `${STORAGE_PREFIX}${leadId}`;
            const stored = window.localStorage.getItem(key);

            if (!stored) {
              anyUnread = true;
              break;
            }

            const lastRead = new Date(stored).getTime();
            const lastMsg = new Date(conv.lastMessageCreatedAt).getTime();

            if (Number.isNaN(lastRead) || lastMsg > lastRead) {
              anyUnread = true;
              break;
            }
          }
        }

        if (!cancelled) setHasUnreadMessages(anyUnread);
      } catch (error) {
        console.error('Error checking unread messages:', error);
        if (!cancelled) setHasUnreadMessages(false);
      }
    };

    updateUnread();
    const interval = setInterval(updateUnread, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, role]);

  // Mega menu Comprar - inspirado em Zillow/Daft/James Edition
  const buyMenuSections = [
    {
      title: "Por tipo de imóvel",
      items: [
        { label: "Casas", href: "/?type=HOUSE", description: "Casas unifamiliares" },
        { label: "Apartamentos", href: "/?type=APARTMENT", description: "Apartamentos e flats" },
        { label: "Condomínios", href: "/?type=CONDO", description: "Condomínios fechados" },
        { label: "Terrenos", href: "/?type=LAND", description: "Lotes e terrenos" },
        { label: "Comercial", href: "/?type=COMMERCIAL", description: "Imóveis comerciais" },
      ],
    },
    {
      title: "Por faixa de preço",
      items: [
        { label: "Até R$ 300 mil", href: "/?maxPrice=300000" },
        { label: "R$ 300k - R$ 500k", href: "/?minPrice=300000&maxPrice=500000" },
        { label: "R$ 500k - R$ 1M", href: "/?minPrice=500000&maxPrice=1000000" },
        { label: "Acima de R$ 1M", href: "/?minPrice=1000000" },
        { label: "Imóveis de luxo", href: "/?minPrice=1500000&sort=price_desc" },
      ],
    },
    {
      title: "Buscar por",
      items: [
        { label: "Novos no mercado", href: "/?sort=recent" },
        { label: "Menor preço", href: "/?sort=price_asc" },
        { label: "Maior área", href: "/?sort=area_desc" },
        { label: "Imóveis mobiliados", href: "/?furnished=true" },
        { label: "Aceita pets", href: "/?petFriendly=true" },
      ],
    },
  ];

  // Mega menu Alugar - inspirado em Zillow/Daft/James Edition
  const rentMenuSections = [
    {
      title: "Por tipo de imóvel",
      items: [
        { label: "Casas", href: "/?status=RENT&type=HOUSE", description: "Casas para locação" },
        { label: "Apartamentos", href: "/?status=RENT&type=APARTMENT", description: "Apartamentos para alugar" },
        { label: "Studios", href: "/?status=RENT&type=STUDIO", description: "Studios e quitinetes" },
        { label: "Condomínios", href: "/?status=RENT&type=CONDO", description: "Condomínios fechados" },
      ],
    },
    {
      title: "Por valor mensal",
      items: [
        { label: "Até R$ 1.500", href: "/?status=RENT&maxPrice=1500" },
        { label: "R$ 1.500 - R$ 3.000", href: "/?status=RENT&minPrice=1500&maxPrice=3000" },
        { label: "R$ 3.000 - R$ 5.000", href: "/?status=RENT&minPrice=3000&maxPrice=5000" },
        { label: "Acima de R$ 5.000", href: "/?status=RENT&minPrice=5000" },
      ],
    },
    {
      title: "Buscar por",
      items: [
        { label: "Novos anúncios", href: "/?status=RENT&sort=recent" },
        { label: "Menor aluguel", href: "/?status=RENT&sort=price_asc" },
        { label: "Mobiliados", href: "/?status=RENT&furnished=true" },
        { label: "Aceita pets", href: "/?status=RENT&petFriendly=true" },
        { label: "Com academia", href: "/?status=RENT&hasGym=true" },
      ],
    },
  ];

  // Recursos consolidados - substitui "Como funciona"
  const resourceSections = [
    {
      title: "Guias e Dicas",
      items: [
        { label: "Guia do comprador", href: "/guia/compra", icon: Home },
        { label: "Guia do inquilino", href: "/guia/locacao", icon: Home },
        { label: "Guia do vendedor", href: "/guia/venda", icon: Megaphone },
        { label: "Em construção · Dicas de venda rápida", href: "/dicas/venda", icon: Star },
        { label: "Como anunciar", href: "/como-anunciar", icon: HelpCircle },
      ],
    },
    {
      title: "Ferramentas",
      items: [
        { label: "Calculadora de financiamento", href: "/calculadora", icon: LineChart },
        { label: "Em construção · Calculadora de aluguel", href: "/calculadora-aluguel", icon: LineChart },
        { label: "Em construção · Estimador de valor", href: "/estimador", icon: LineChart },
        { label: "Em construção · Comparador de preços", href: "/comparador", icon: LineChart },
      ],
    },
    {
      title: "Serviços",
      items: [
        { label: "Financiamento imobiliário", href: "/financing", icon: Building2 },
        { label: "Análise de mercado", href: "/owner/analytics", icon: LineChart },
        { label: "Em construção · Contratar fotógrafo", href: "/fotografo", icon: Settings },
      ],
    },
    {
      title: "Minha conta",
      items: [
        { label: "Buscas salvas", href: "/saved-searches", icon: Bookmark },
        { label: "Meus favoritos", href: "/favorites", icon: Heart },
      ],
    },
  ];

  const megaMenuBaseClass =
    "absolute inset-x-0 top-full z-[300] mt-3 bg-white/95 backdrop-blur-xl border-t border-gray-100/80 shadow-[0_18px_45px_rgba(15,23,42,0.45)]";

  const isDashboardContext = pathname?.startsWith("/admin") || pathname?.startsWith("/owner") || pathname?.startsWith("/broker");

  const isHome = pathname === "/";
  const mobileVariant = !isDashboardContext && isHome && !forceLight ? "overlay" : "solid";

  return (
    <>
      {/* Mobile Header */}
      <MobileHeaderZillow variant={mobileVariant} />

      {/* Desktop Navigation - JamesEdition style on home, solid on dashboards */}
      <motion.nav
        ref={navRef}
        className={`hidden md:block w-full relative z-[200] transition-all duration-300 ${
          isDashboardContext
            ? "bg-brand-gradient shadow-md"
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
              <div
                className=""
                onMouseEnter={() => setOpenMenu("comprar")}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu("comprar")}
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
                  <div
                    className={megaMenuBaseClass}
                    onMouseLeave={() => setOpenMenu(null)}
                  >
                    <div className="mx-auto max-w-7xl px-8 py-6">
                      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Explorar para comprar
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {buyMenuSections.map((section) => (
                          <div key={section.title}>
                            <div className="flex items-center gap-2 px-1 pb-2">
                              <span className="h-5 w-1 rounded-full bg-teal-500/80" />
                              <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                {section.title}
                              </div>
                            </div>
                            <ul className="space-y-1.5">
                              {section.items.map((item) => (
                                <li key={item.href}>
                                  <Link
                                    href={item.href}
                                    className="block px-2 py-2 rounded-lg text-sm text-gray-800 hover:bg-teal-50 group"
                                    onClick={() => { setOpenMenu(null); setPrimary('comprar'); }}
                                  >
                                    <div className="font-medium text-gray-900 group-hover:text-teal-700">{item.label}</div>
                                    {'description' in item && (
                                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                    )}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Alugar */}
              <div
                className=""
                onMouseEnter={() => setOpenMenu("alugar")}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenu("alugar")}
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
                  <div
                    className={megaMenuBaseClass}
                    onMouseLeave={() => setOpenMenu(null)}
                  >
                    <div className="mx-auto max-w-7xl px-8 py-6">
                      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Explorar para alugar
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                        {rentMenuSections.map((section) => (
                          <div key={section.title}>
                            <div className="flex items-center gap-2 px-1 pb-2">
                              <span className="h-5 w-1 rounded-full bg-teal-500/80" />
                              <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                {section.title}
                              </div>
                            </div>
                            <ul className="space-y-1.5">
                              {section.items.map((item) => (
                                <li key={item.href}>
                                  <Link
                                    href={item.href}
                                    className="block px-2 py-2 rounded-lg text-sm text-gray-800 hover:bg-teal-50 group"
                                    onClick={() => { setOpenMenu(null); setPrimary('alugar'); }}
                                  >
                                    <div className="font-medium text-gray-900 group-hover:text-teal-700">{item.label}</div>
                                    {'description' in item && (
                                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                    )}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
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
          <div className="flex items-center justify-center gap-4">
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
            <div
              className="hidden lg:block"
              onMouseEnter={() => setOpenMenu("recursos")}
            >
              <button 
                type="button"
                onClick={() => setOpenMenu("recursos")} 
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  forceLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <span>Recursos</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openMenu === 'recursos' ? 'rotate-180' : ''}`} />
              </button>
              {openMenu === "recursos" && (
                <div
                  className={megaMenuBaseClass}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <div className="mx-auto max-w-7xl px-8 py-6">
                    <div className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Central de recursos
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                      {resourceSections.map((section) => (
                        <div key={section.title}>
                          <div className="flex items-center gap-2 px-1 pb-2">
                            <span className="h-5 w-1 rounded-full bg-teal-500/80" />
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                              {section.title}
                            </div>
                          </div>
                          <ul className="space-y-1.5">
                            {section.items.map((item) => (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-800 hover:bg-teal-50 group"
                                  onClick={() => setOpenMenu(null)}
                                >
                                  {item.icon && <item.icon className="w-4 h-4 text-gray-400 group-hover:text-teal-600" />}
                                  <span className="font-medium text-gray-900 group-hover:text-teal-700">{item.label}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
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
            {(role === 'REALTOR' || role === 'AGENCY' || role === 'ADMIN') && (
              <Link
                href="/broker/messages"
                className={`relative p-2 rounded-lg transition-colors ${
                  forceLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                }`}
              >
                <Bell className="w-5 h-5" />
                {hasUnreadMessages && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
                )}
              </Link>
            )}
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
