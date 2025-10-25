"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Menu, X, User, Heart, Bell, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ModernNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [megaMenu, setMegaMenu] = useState<"comprar" | "alugar" | "vender" | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const { scrollY } = useScroll();
  
  const role = (session as any)?.user?.role || "USER";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 1)"]
  );

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
    { label: "Vender", key: "vender" as const },
  ];

  return (
    <motion.nav
      style={{ backgroundColor }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "shadow-lg backdrop-blur-lg" : ""
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center"
            >
              <span className="text-white font-bold text-xl">Z</span>
            </motion.div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ZillowLike
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 mega-menu-container">
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => setMegaMenu(item.key)}
                onClick={() => setMegaMenu(megaMenu === item.key ? null : item.key)}
                className={`text-gray-900 hover:text-blue-600 font-semibold transition-colors relative group ${
                  megaMenu === item.key ? 'text-blue-600' : ''
                }`}
              >
                {item.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${
                  megaMenu === item.key ? 'w-full' : 'w-0 group-hover:w-full'
                }`} />
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/favorites" className="p-2 hover:bg-gray-100 rounded-full transition-colors relative">
              <Heart className="w-5 h-5 text-gray-700" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                0
              </span>
            </Link>
            
            {session && (
              <Link href="/notifications" className="p-2 hover:bg-gray-100 rounded-full transition-colors relative">
                <Bell className="w-5 h-5 text-gray-700" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              </Link>
            )}
            
            {session ? (
              <div className="relative">
                <motion.button
                  id="user-menu-trigger"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-glow transition-all"
                >
                  <User className="w-4 h-4" />
                  Dashboard
                  <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </motion.button>
                {userMenuOpen && (
                  <div
                    id="user-menu-dropdown"
                    className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 border-b">
                      <div className="text-sm text-gray-500">Logado como</div>
                      <div className="text-sm font-semibold text-gray-900 truncate">{(session as any)?.user?.email || 'Conta'}</div>
                    </div>
                    <div className="py-1">
                      {role === 'ADMIN' && (
                        <>
                          <Link href="/admin" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Painel Admin</Link>
                          <Link href="/admin/properties" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Gerenciar imóveis</Link>
                          <Link href="/admin/users" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Usuários</Link>
                          <Link href="/admin/realtor-applications" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Aplicações de corretores</Link>
                          <div className="my-1 border-t" />
                        </>
                      )}
                      {role === 'OWNER' && (
                        <>
                          <Link href="/owner/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Painel do proprietário</Link>
                          <Link href="/owner/new" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Anunciar imóvel</Link>
                          <Link href="/owner/properties" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Meus anúncios</Link>
                          <Link href="/owner/leads" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Meus leads</Link>
                          <Link href="/owner/analytics" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Analytics</Link>
                          <div className="my-1 border-t" />
                        </>
                      )}
                      {role === 'REALTOR' && (
                        <>
                          <Link href="/realtor" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Painel do corretor</Link>
                          <Link href="/alerts" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Alertas</Link>
                          <div className="my-1 border-t" />
                        </>
                      )}
                      {role === 'USER' && (
                        <>
                          <Link href="/owner/new" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Anunciar imóvel</Link>
                          <div className="my-1 border-t" />
                        </>
                      )}
                      <Link href="/favorites" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Favoritos</Link>
                      <Link href="/saved-searches" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Buscas salvas</Link>
                      <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-blue-50">Perfil e conta</Link>
                    </div>
                    <div className="border-t">
                      <button onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: "/" }); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">Sair</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => signIn()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-glow transition-all"
              >
                <User className="w-4 h-4" />
                Entrar
              </motion.button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isOpen ? <X className="w-6 h-6 text-gray-900" /> : <Menu className="w-6 h-6 text-gray-900" />}
          </button>
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
              {megaMenu === "vender" && (
                <>
                  <MegaMenuSection
                    title="Vender seu imóvel"
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

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0 }}
        className="md:hidden overflow-hidden bg-white border-t border-gray-200"
      >
        <div className="container mx-auto px-4 py-4 space-y-4">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setMegaMenu(item.key);
                setIsOpen(false);
              }}
              className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              {item.label}
            </button>
          ))}
          {session ? (
            <>
              <div className="space-y-2">
                {role === 'ADMIN' && (
                  <>
                    <Link href="/admin" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 bg-blue-50 rounded-lg font-medium text-blue-700">Painel Admin</Link>
                    <Link href="/admin/properties" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Gerenciar imóveis</Link>
                    <Link href="/admin/users" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Usuários</Link>
                    <Link href="/admin/realtor-applications" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Aplicações de corretores</Link>
                  </>
                )}
                {role === 'OWNER' && (
                  <>
                    <Link href="/owner/dashboard" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 bg-blue-50 rounded-lg font-medium text-blue-700">Painel do proprietário</Link>
                    <Link href="/owner/new" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Anunciar imóvel</Link>
                    <Link href="/owner/properties" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Meus anúncios</Link>
                    <Link href="/owner/leads" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Meus leads</Link>
                    <Link href="/owner/analytics" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Analytics</Link>
                  </>
                )}
                {role === 'REALTOR' && (
                  <>
                    <Link href="/realtor" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 bg-blue-50 rounded-lg font-medium text-blue-700">Painel do corretor</Link>
                    <Link href="/alerts" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Alertas</Link>
                  </>
                )}
                {role === 'USER' && (
                  <>
                    <Link href="/owner/new" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 bg-blue-50 rounded-lg font-medium text-blue-700">Anunciar imóvel</Link>
                  </>
                )}
                <Link href="/favorites" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Favoritos</Link>
                <Link href="/saved-searches" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Buscas salvas</Link>
                <Link href="/profile" onClick={() => setIsOpen(false)} className="block w-full px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50">Perfil e conta</Link>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="mt-3 block w-full py-3 border-2 border-red-600 text-red-600 rounded-xl font-semibold text-center hover:bg-red-50"
              >
                Sair
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setIsOpen(false);
                signIn();
              }}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold"
            >
              Entrar
            </button>
          )}
        </div>
      </motion.div>
    </motion.nav>
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
              className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all font-medium"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
