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
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Left: Hamburger Menu */}
          <button
            onClick={() => {
              setIsLeftMenuOpen(true);
              setIsRightMenuOpen(false);
            }}
            className="p-2"
            aria-label="Menu de imóveis"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>

          {/* Center: Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">Z</span>
            </div>
            <span className="text-lg font-bold text-gray-900">ZillowLike</span>
          </Link>

          {/* Right: User Menu */}
          <button
            onClick={() => {
              setIsRightMenuOpen(true);
              setIsLeftMenuOpen(false);
            }}
            className="p-2"
            aria-label="Menu do usuário"
          >
            {session ? (
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {(session as any)?.user?.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
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
              className="md:hidden fixed inset-0 bg-black/50 z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="md:hidden fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-[70] overflow-y-auto"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Menu</h2>
                <button onClick={() => setIsLeftMenuOpen(false)} className="p-2">
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="py-2">
                {/* Buy Section */}
                <div>
                  <button
                    onClick={() => toggleSection('buy')}
                    className="w-full flex items-center justify-between px-6 py-4 text-left border-b"
                  >
                    <span className="text-lg font-semibold text-gray-900">Comprar</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${expandedSection === 'buy' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSection === 'buy' && (
                    <div className="bg-gray-50 py-2">
                      <Link href="/?type=HOUSE" onClick={() => setIsLeftMenuOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">
                        Casas
                      </Link>
                      <Link href="/?type=APARTMENT" onClick={() => setIsLeftMenuOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">
                        Apartamentos
                      </Link>
                      <Link href="/?type=CONDO" onClick={() => setIsLeftMenuOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">
                        Condomínios
                      </Link>
                      <Link href="/?type=LAND" onClick={() => setIsLeftMenuOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">
                        Terrenos
                      </Link>
                    </div>
                  )}
                </div>

                {/* Rent Section */}
                <div>
                  <button
                    onClick={() => toggleSection('rent')}
                    className="w-full flex items-center justify-between px-6 py-4 text-left border-b"
                  >
                    <span className="text-lg font-semibold text-gray-900">Alugar</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${expandedSection === 'rent' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSection === 'rent' && (
                    <div className="bg-gray-50 py-2">
                      <Link href="/?purpose=RENT&type=HOUSE" onClick={() => setIsLeftMenuOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">
                        Casas para alugar
                      </Link>
                      <Link href="/?purpose=RENT&type=APARTMENT" onClick={() => setIsLeftMenuOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">
                        Apartamentos
                      </Link>
                      <Link href="/calculadora-aluguel" onClick={() => setIsLeftMenuOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">
                        Calculadora
                      </Link>
                    </div>
                  )}
                </div>

                {/* Sell Section */}
                <div>
                  <button
                    onClick={() => toggleSection('sell')}
                    className="w-full flex items-center justify-between px-6 py-4 text-left border-b"
                  >
                    <span className="text-lg font-semibold text-gray-900">Vender</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${expandedSection === 'sell' ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedSection === 'sell' && (
                    <div className="bg-gray-50 py-2">
                      <Link href="/owner/new" onClick={() => setIsLeftMenuOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">
                        Anunciar imóvel
                      </Link>
                      {role === 'OWNER' && (
                        <>
                          <Link href="/owner/properties" onClick={() => setIsLeftMenuOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">
                            Meus anúncios
                          </Link>
                          <Link href="/owner/leads" onClick={() => setIsLeftMenuOpen(false)} className="block px-8 py-3 text-gray-700 hover:bg-gray-100">
                            Meus leads
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Mortgage */}
                <Link href="/calculadora" onClick={() => setIsLeftMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                  Calculadora de financiamento
                </Link>

                {/* Find agent */}
                <Link href="/realtor" onClick={() => setIsLeftMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                  Encontrar corretor
                </Link>

                {/* Help */}
                <Link href="/ajuda" onClick={() => setIsLeftMenuOpen(false)} className="block px-6 py-4 text-lg font-semibold text-gray-900 border-b">
                  Ajuda
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
              className="md:hidden fixed inset-0 bg-black/50 z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="md:hidden fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white z-[70] overflow-y-auto"
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
