"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { Menu, X, User, Heart, ChevronDown, ChevronRight, Home, Building2, Megaphone, LineChart, Users, Bookmark, ClipboardList, LogOut, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileHeaderZillow() {
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { data: session } = useSession();
  const role = (session as any)?.user?.role || "USER";

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <>
      {/* Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/80 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between px-4 h-16 max-w-5xl mx-auto">
          {/* Left: Hamburger Menu */}
          <button
            onClick={() => {
              setIsLeftMenuOpen(true);
              setIsRightMenuOpen(false);
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Menu de imóveis"
          >
            <Menu className="w-6 h-6 text-gray-800" />
          </button>

          {/* Center: Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-base">Z</span>
            </div>
            <span className="text-lg font-semibold text-slate-900 tracking-tight">ZillowLike</span>
          </Link>

          {/* Right: User Menu */}
          <button
            onClick={() => {
              setIsRightMenuOpen(true);
              setIsLeftMenuOpen(false);
            }}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Menu do usuário"
          >
            {session ? (
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                <span>{(session as any)?.user?.name?.[0]?.toUpperCase() || 'U'}</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-700" />
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Left Menu - Imóveis */}
      <AnimatePresence>
        {isLeftMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLeftMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-[9998]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="md:hidden fixed inset-y-0 left-0 w-[88%] max-w-sm bg-white/95 backdrop-blur-xl z-[9999] shadow-2xl flex flex-col"
            >
              <div className="px-5 py-4 border-b border-gray-100/80 flex items-center justify-between bg-gradient-to-r from-teal-600 to-teal-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-semibold">
                    Z
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold tracking-wide">Menu</span>
                    <span className="text-xs text-teal-50/90">Explorar imóveis e recursos</span>
                  </div>
                </div>
                <button onClick={() => setIsLeftMenuOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3">
                {/* Buy Section */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => toggleSection("buy")}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Home className="w-5 h-5 text-teal-600" />
                      <div>
                        <span className="block text-sm font-semibold text-gray-900">Comprar</span>
                        <span className="block text-xs text-gray-500">Casas, apartamentos, terrenos</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedSection === "buy" ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedSection === "buy" && (
                    <div className="bg-gray-50 pt-1 pb-3 space-y-1">
                      <Link
                        href="/?type=HOUSE"
                        onClick={() => setIsLeftMenuOpen(false)}
                        className="flex items-center justify-between px-11 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span>Casas</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                      <Link
                        href="/?type=APARTMENT"
                        onClick={() => setIsLeftMenuOpen(false)}
                        className="flex items-center justify-between px-11 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span>Apartamentos</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                      <Link
                        href="/?type=CONDO"
                        onClick={() => setIsLeftMenuOpen(false)}
                        className="flex items-center justify-between px-11 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span>Condomínios</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                      <Link
                        href="/?type=LAND"
                        onClick={() => setIsLeftMenuOpen(false)}
                        className="flex items-center justify-between px-11 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span>Terrenos</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Rent Section */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => toggleSection("rent")}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-teal-600" />
                      <div>
                        <span className="block text-sm font-semibold text-gray-900">Alugar</span>
                        <span className="block text-xs text-gray-500">Casas e apartamentos para locação</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedSection === "rent" ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedSection === "rent" && (
                    <div className="bg-gray-50 pt-1 pb-3 space-y-1">
                      <Link
                        href="/?purpose=RENT&type=HOUSE"
                        onClick={() => setIsLeftMenuOpen(false)}
                        className="flex items-center justify-between px-11 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span>Casas para alugar</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                      <Link
                        href="/?purpose=RENT&type=APARTMENT"
                        onClick={() => setIsLeftMenuOpen(false)}
                        className="flex items-center justify-between px-11 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span>Apartamentos</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                      <Link
                        href="/calculadora-aluguel"
                        onClick={() => setIsLeftMenuOpen(false)}
                        className="flex items-center justify-between px-11 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span>Calculadora de aluguel</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Sell Section */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => toggleSection("sell")}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Megaphone className="w-5 h-5 text-teal-600" />
                      <div>
                        <span className="block text-sm font-semibold text-gray-900">Vender</span>
                        <span className="block text-xs text-gray-500">Anunciar como pessoa física ou corretor</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedSection === "sell" ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedSection === "sell" && (
                    <div className="bg-gray-50 pt-1 pb-3 space-y-1">
                      <Link
                        href="/owner/new"
                        onClick={() => setIsLeftMenuOpen(false)}
                        className="flex items-center justify-between px-11 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span>Anunciar imóvel</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                      {role === "OWNER" && (
                        <>
                          <Link
                            href="/owner/properties"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-11 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <span>Meus anúncios</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                          <Link
                            href="/owner/leads"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-11 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <span>Meus leads</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Mortgage */}
                <Link
                  href="/calculadora"
                  onClick={() => setIsLeftMenuOpen(false)}
                  className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-900 border-b border-gray-100 hover:bg-gray-50"
                >
                  <span className="flex items-center gap-3">
                    <LineChart className="w-5 h-5 text-teal-600" />
                    <span>Calculadora de financiamento</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>

                {/* Find agent */}
                <Link
                  href="/realtor"
                  onClick={() => setIsLeftMenuOpen(false)}
                  className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-900 border-b border-gray-100 hover:bg-gray-50"
                >
                  <span className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-teal-600" />
                    <span>Encontrar corretor</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>

                {/* Help */}
                <Link
                  href="/ajuda"
                  onClick={() => setIsLeftMenuOpen(false)}
                  className="flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  <span className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-teal-600" />
                    <span>Ajuda</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right Menu - User */}
      <AnimatePresence>
        {isRightMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRightMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-[9998]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="md:hidden fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white z-[9999] overflow-y-auto"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Minha conta</h2>
                <button onClick={() => setIsRightMenuOpen(false)} className="p-2">
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="py-2">
                {session ? (
                  <>
                    <Link href="/favorites" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                      Favoritos
                    </Link>
                    <Link href="/saved-searches" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                      Buscas salvas
                    </Link>
                    
                    {role === 'OWNER' && (
                      <>
                        <Link href="/owner/properties" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                          Meus anúncios
                        </Link>
                        <Link href="/owner/leads" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                          Meus leads
                        </Link>
                      </>
                    )}

                    {(role === 'REALTOR' || role === 'AGENCY') && (
                      <Link href="/broker/leads" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                        Leads
                      </Link>
                    )}

                    {role === 'ADMIN' && (
                      <>
                        <Link href="/admin" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                          Painel Admin
                        </Link>
                        <Link href="/admin/properties" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                          Gerenciar imóveis
                        </Link>
                        <Link href="/admin/users" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                          Usuários
                        </Link>
                      </>
                    )}

                    <Link href="/profile" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                      Configurações da conta
                    </Link>

                    <button
                      onClick={() => {
                        setIsRightMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="w-full text-left px-6 py-4 text-lg font-semibold text-gray-900 border-b"
                    >
                      Sair
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsRightMenuOpen(false);
                      signIn();
                    }}
                    className="w-full text-left px-6 py-4 text-lg font-semibold text-teal-600"
                  >
                    Entrar / Criar conta
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
