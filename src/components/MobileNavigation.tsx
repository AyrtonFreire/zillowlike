"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const user = (session as any)?.user || null;

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/60">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Zillowlike</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="lg:hidden fixed top-16 left-0 right-0 bottom-0 z-50 bg-white animate-slide-up">
            <div className="flex flex-col h-full">
              {/* Menu Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* User Section */}
                {user && (
                  <div className="mb-8 p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-semibold text-lg">
                          {user.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Links */}
                <nav className="space-y-2">
                  <MobileNavItem 
                    href="/?type=HOUSE" 
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    }
                    onClick={() => setIsOpen(false)}
                  >
                    Comprar
                  </MobileNavItem>

                  <MobileNavItem 
                    href="/?type=APARTMENT" 
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    }
                    onClick={() => setIsOpen(false)}
                  >
                    Alugar
                  </MobileNavItem>

                  <MobileNavItem 
                    href="/owner/new" 
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    }
                    onClick={() => setIsOpen(false)}
                  >
                    Anunciar Imóvel
                  </MobileNavItem>

                  <MobileNavItem 
                    href="/favorites" 
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 000-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    }
                    onClick={() => setIsOpen(false)}
                  >
                    Favoritos
                  </MobileNavItem>

                  <MobileNavItem 
                    href="/saved-searches" 
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    }
                    onClick={() => setIsOpen(false)}
                  >
                    Buscas Salvas
                  </MobileNavItem>

                  {user && (
                    <MobileNavItem 
                      href="/owner" 
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      }
                      onClick={() => setIsOpen(false)}
                    >
                      Meus Imóveis
                    </MobileNavItem>
                  )}
                </nav>

                {/* Quick Actions */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/?city=Petrolina"
                      onClick={() => setIsOpen(false)}
                      className="p-4 bg-primary-50 rounded-xl border border-primary-200 text-center"
                    >
                      <div className="text-primary-600 font-semibold text-sm">Petrolina</div>
                      <div className="text-primary-500 text-xs">Ver imóveis</div>
                    </Link>
                    <Link
                      href="/?city=Juazeiro"
                      onClick={() => setIsOpen(false)}
                      className="p-4 bg-success-50 rounded-xl border border-success-200 text-center"
                    >
                      <div className="text-success-600 font-semibold text-sm">Juazeiro</div>
                      <div className="text-success-500 text-xs">Ver imóveis</div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                {status === 'loading' ? (
                  <div className="flex items-center justify-center py-3">
                    <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : user ? (
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: '/' });
                      setIsOpen(false);
                    }}
                    className="w-full btn btn-secondary py-3 text-base font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      signIn('google', { callbackUrl: '/' });
                      setIsOpen(false);
                    }}
                    className="w-full btn btn-primary py-3 text-base font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Entrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

interface MobileNavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

function MobileNavItem({ href, icon, children, onClick }: MobileNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors group"
    >
      <div className="text-gray-500 group-hover:text-primary-600 transition-colors">
        {icon}
      </div>
      <span className="font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
        {children}
      </span>
      <svg className="w-5 h-5 text-gray-300 ml-auto group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
