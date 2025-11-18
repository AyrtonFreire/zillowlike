"use client";

import { motion, useScroll, AnimatePresence } from "framer-motion";
import { Menu, X, User, Heart, Bell, LogOut, ChevronDown, LayoutDashboard, Building2, ClipboardList, Users, Wrench, LineChart, Megaphone, Star, Settings, Bookmark, Home, HelpCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileHeaderZillow from "./MobileHeaderZillow";
import HowItWorksModal from "./HowItWorksModal";

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
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const closeTimer = useRef<number | null>(null as any);

  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = (delay = 150) => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setMegaMenu(null), delay);
  };
  
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

      {/* Desktop Navigation - Transparent overlay style */}
      <motion.nav
        className={`hidden md:block fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 shadow-lg backdrop-blur-lg' 
            : 'bg-transparent'
        }`}
        onMouseLeave={() => scheduleClose(160)}
        onMouseEnter={() => cancelClose()}
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
                onMouseEnter={() => { cancelClose(); setMegaMenu(item.key); setPrimary(item.key); }}
                onClick={() => { setMegaMenu(megaMenu === item.key ? null : item.key); setPrimary(item.key); }}
                className={`font-semibold text-[15px] transition-colors relative group ${
                  isScrolled 
                    ? (primary === item.key ? 'text-teal' : 'text-gray-900 hover:text-teal')
                    : (primary === item.key ? 'text-white' : 'text-white/90 hover:text-white')
                }`}
              >
                {item.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
                  isScrolled ? 'bg-teal' : 'bg-white'
                } ${
                  primary === item.key ? 'w-full' : 'w-0 group-hover:w-full'
                }`} />
              </button>
            ))}
            </div>
          </div>

          {/* Center: Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl transition-colors ${
                isScrolled ? 'glass-teal text-white' : 'bg-white/20 backdrop-blur text-white'
              }`}>
                Z
              </div>
              <span className={`hidden lg:block text-xl font-bold transition-colors ${
                isScrolled ? 'text-gray-900' : 'text-white'
              }`}>ZillowLike</span>
            </Link>
          </div>
          
          {/* Right: Context links (3) + account */}
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={() => setHowItWorksOpen(true)} 
              className={`hidden lg:flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                isScrolled ? 'text-gray-700 hover:bg-gray-50' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Como funciona</span>
            </button>
            <Link 
              href="/favorites" 
              className={`p-2 rounded-lg transition-colors ${
                isScrolled ? 'text-gray-700 hover:bg-gray-50' : 'text-white hover:bg-white/10'
              }`}
            >
              <Heart className="w-5 h-5" />
            </Link>
            {session ? (
              <div className="relative" id="user-menu-trigger">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isScrolled ? 'hover:bg-gray-50' : 'hover:bg-white/10'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-medium text-sm">
                    {session.user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  isScrolled 
                    ? 'glass-teal text-white hover:bg-blue-700' 
                    : 'bg-white/20 backdrop-blur text-white hover:bg-white/30'
                }`}
              >
                Entrar
              </button>
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
          className="absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-2xl mega-menu-container z-[10000]"
          onMouseEnter={() => cancelClose()}
          onMouseLeave={() => scheduleClose(160)}
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

      {/* How It Works Modal */}
      <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
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
