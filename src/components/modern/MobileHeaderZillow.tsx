"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { Menu, X, User, Heart, Bell, MessageCircle, ChevronDown, ChevronRight, Home, Building2, Megaphone, LineChart, Users, Bookmark, ClipboardList, LogOut, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

interface MobileHeaderZillowProps {
  variant?: "overlay" | "solid";
}

export default function MobileHeaderZillow({ variant = "solid" }: MobileHeaderZillowProps) {
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const role = (session as any)?.user?.role || (session as any)?.role || "USER";
  const [hasUnreadUserChats, setHasUnreadUserChats] = useState(false);
  const [assistantActiveCount, setAssistantActiveCount] = useState(0);

  const isBrokerContext = !!pathname?.startsWith("/broker");
  const canShowAssistant =
    !!session &&
    isBrokerContext &&
    (role === "REALTOR" || role === "ADMIN");

  const isOverlay = variant === "overlay";

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  useEffect(() => {
    if (role !== "USER") {
      setHasUnreadUserChats(false);
      return;
    }
    if (typeof window === "undefined") return;

    try {
      setHasUnreadUserChats(!!(window as any).__zlw_has_unread_user_chats);
    } catch {
      setHasUnreadUserChats(false);
    }

    let cancelled = false;
    let interval: any;

    const onUnread = (evt: Event) => {
      try {
        const anyEvt: any = evt as any;
        const unread = !!anyEvt?.detail?.unread;
        setHasUnreadUserChats(unread);
      } catch {
        setHasUnreadUserChats(false);
      }
    };

    window.addEventListener("zlw-user-chat-unread", onUnread as any);

    const shouldFallbackPoll = !((window as any).__zlw_provider_user_chat_unread);

    const updateUnreadFallback = async () => {
      if ((window as any).__zlw_provider_user_chat_unread) {
        try {
          if (interval) clearInterval(interval);
        } catch {
        }
        interval = null;
        return;
      }
      if (!shouldFallbackPoll) return;
      if (cancelled) return;
      try {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        const response = await fetch("/api/chats");
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success || !Array.isArray(data.chats)) {
          setHasUnreadUserChats(false);
          return;
        }

        const STORAGE_PREFIX = "zlw_user_chat_last_read_";
        let anyUnread = false;
        for (const chat of data.chats) {
          const leadId = String(chat.leadId || "");
          if (!leadId) continue;
          const lastMessageAt = chat.lastMessageAt as string | undefined;
          const lastMessageFromClient = chat.lastMessageFromClient as boolean | undefined;
          if (!lastMessageAt || lastMessageFromClient !== false) continue;
          const key = `${STORAGE_PREFIX}${leadId}`;
          const stored = window.localStorage.getItem(key);
          if (!stored) {
            anyUnread = true;
            break;
          }
          const lastRead = new Date(stored).getTime();
          const lastMsg = new Date(lastMessageAt).getTime();
          if (Number.isNaN(lastRead) || Number.isNaN(lastMsg) || lastMsg > lastRead) {
            anyUnread = true;
            break;
          }
        }
        setHasUnreadUserChats(anyUnread);
      } catch {
        setHasUnreadUserChats(false);
      }
    };

    updateUnreadFallback();
    interval = shouldFallbackPoll ? setInterval(updateUnreadFallback, 300000) : null;

    return () => {
      cancelled = true;
      try {
        window.removeEventListener("zlw-user-chat-unread", onUnread as any);
      } catch {
      }
      try {
        if (interval) clearInterval(interval);
      } catch {
      }
    };
  }, [role]);

  useEffect(() => {
    if (!canShowAssistant) {
      setAssistantActiveCount(0);
      return;
    }
    if (typeof window === "undefined") return;

    try {
      const initial = Number((window as any).__zlw_assistant_active_count || 0);
      setAssistantActiveCount(Number.isFinite(initial) ? initial : 0);
    } catch {
      setAssistantActiveCount(0);
    }

    const onCount = (evt: Event) => {
      try {
        const anyEvt: any = evt as any;
        const count = Number(anyEvt?.detail?.count || 0);
        setAssistantActiveCount(Number.isFinite(count) ? count : 0);
      } catch {
        setAssistantActiveCount(0);
      }
    };

    window.addEventListener("zlw-assistant-count", onCount as any);
    return () => {
      window.removeEventListener("zlw-assistant-count", onCount as any);
    };
  }, [canShowAssistant]);

  const openAssistant = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("assistant", "1");
      router.push(`${url.pathname}?${url.searchParams.toString()}${url.hash}`);
    } catch {
      router.push("/broker/dashboard?assistant=1");
    }
  };

  return (
    <>
      {/* Header */}
      <header
        className={
          "md:hidden w-full " +
          (isOverlay
            ? "bg-transparent text-white"
            : "bg-white/90 backdrop-blur-xl border-b border-gray-100/80 shadow-[0_12px_30px_rgba(15,23,42,0.12)]")
        }
      >
        <div className="flex items-center justify-between px-4 h-16 max-w-5xl mx-auto">
          {/* Left: Hamburger Menu */}
          <button
            onClick={() => {
              setIsLeftMenuOpen(true);
              setIsRightMenuOpen(false);
            }}
            className={`p-2 rounded-full transition-colors ${
              isOverlay ? "hover:bg-white/10" : "hover:bg-gray-100"
            }`}
            aria-label="Menu de imóveis"
          >
            <Menu className={`w-6 h-6 ${isOverlay ? "text-white" : "text-gray-800"}`} />
          </button>

          {/* Center: Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-brand-teal flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-base">O</span>
            </div>
            <span
              className={`text-lg font-semibold tracking-tight ${
                isOverlay ? "text-white" : "text-slate-900"
              }`}
            >
              OggaHub
            </span>
          </Link>

          {/* Right: Notifications + User Menu */}
          <div className="flex items-center gap-2">
            {canShowAssistant && (
              <button
                type="button"
                onClick={() => {
                  setIsLeftMenuOpen(false);
                  setIsRightMenuOpen(false);
                  openAssistant();
                }}
                className={`relative p-2 rounded-full transition-colors ${
                  isOverlay ? "hover:bg-white/10" : "hover:bg-gray-100"
                }`}
                aria-label="Assistente"
              >
                <ClipboardList className={`w-5 h-5 ${isOverlay ? "text-white" : "text-gray-800"}`} />
                {assistantActiveCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-white">
                    {assistantActiveCount > 99 ? "99+" : assistantActiveCount}
                  </span>
                )}
              </button>
            )}

            {session && role === "USER" && (
              <Link
                href="/chats"
                onClick={() => {
                  setIsLeftMenuOpen(false);
                  setIsRightMenuOpen(false);
                }}
                className={`relative p-2 rounded-full transition-colors ${
                  isOverlay ? "hover:bg-white/10" : "hover:bg-gray-100"
                }`}
                aria-label="Conversas"
              >
                <Bell className={`w-5 h-5 ${isOverlay ? "text-white" : "text-gray-800"}`} />
                {hasUnreadUserChats && (
                  <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ${
                    isOverlay ? "border border-white/60" : "border border-white"
                  }`} />
                )}
              </Link>
            )}

            <button
              onClick={() => {
                setIsRightMenuOpen(true);
                setIsLeftMenuOpen(false);
              }}
              className={`p-1.5 rounded-full transition-colors ${
                isOverlay ? "hover:bg-white/10" : "hover:bg-gray-100"
              }`}
              aria-label="Menu do usuário"
            >
              {session ? (
                <div className="w-8 h-8 rounded-full bg-brand-teal text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                  <span>{(session as any)?.user?.name?.[0]?.toUpperCase() || 'U'}</span>
                </div>
              ) : (
                <div
                  className={
                    "w-8 h-8 rounded-full flex items-center justify-center " +
                    (isOverlay
                      ? "bg-white/15 border border-white/30"
                      : "bg-gray-100 border border-gray-200")
                  }
                >
                  <User className={`w-5 h-5 ${isOverlay ? "text-white" : "text-gray-700"}`} />
                </div>
              )}
            </button>
          </div>
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
              <div className="px-5 py-4 border-b border-gray-100/80 flex items-center justify-between bg-brand-gradient text-white">
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
                  <Link
                    href="/explore/buy"
                    onClick={() => {
                      setIsLeftMenuOpen(false);
                      setExpandedSection(null);
                    }}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Home className="w-5 h-5 text-brand-teal" />
                      <div>
                        <span className="block text-sm font-semibold text-gray-900">Comprar</span>
                        <span className="block text-xs text-gray-500">Casas, apartamentos, terrenos</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                </div>

                {/* Rent Section */}
                <div className="border-b border-gray-100">
                  <Link
                    href="/explore/rent"
                    onClick={() => {
                      setIsLeftMenuOpen(false);
                      setExpandedSection(null);
                    }}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-brand-teal" />
                      <div>
                        <span className="block text-sm font-semibold text-gray-900">Alugar</span>
                        <span className="block text-xs text-gray-500">Casas e apartamentos para locação</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                </div>

                {/* Sell Section */}
                <div className="border-b border-gray-100">
                  <Link
                    href="/start"
                    onClick={() => {
                      setIsLeftMenuOpen(false);
                      setExpandedSection(null);
                    }}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Megaphone className="w-5 h-5 text-brand-teal" />
                      <div>
                        <span className="block text-sm font-semibold text-gray-900">Anunciar</span>
                        <span className="block text-xs text-gray-500">Anunciar como pessoa física ou corretor</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                </div>

                {/* Resources */}
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <button
                    onClick={() => toggleSection("resources")}
                    className="w-full flex items-center justify-between px-5 py-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <LineChart className="w-5 h-5 text-brand-teal" />
                      <div>
                        <span className="block text-sm font-semibold text-gray-900">Recursos</span>
                        <span className="block text-xs text-gray-500">Guias, ferramentas e serviços</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedSection === "resources" ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expandedSection === "resources" && (
                    <div className="bg-gray-50 pt-2 pb-4 space-y-4">
                      {/* Guias e Dicas */}
                      <div>
                        <div className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Guias e dicas
                        </div>
                        <div className="space-y-1">
                          <Link
                            href="/guia/compra"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-5 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-3">
                              <Home className="w-4 h-4 text-brand-teal" />
                              <span>Guia do comprador</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                          <Link
                            href="/guia/locacao"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-5 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-3">
                              <Home className="w-4 h-4 text-teal-600" />
                              <span>Guia do inquilino</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                          <Link
                            href="/guia/venda"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-5 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-3">
                              <Megaphone className="w-4 h-4 text-brand-teal" />
                              <span>Guia do vendedor</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                          <Link
                            href="/como-anunciar"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-5 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-3">
                              <ClipboardList className="w-4 h-4 text-brand-teal" />
                              <span>Como anunciar</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                        </div>
                      </div>

                      {/* Ferramentas */}
                      <div>
                        <div className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Ferramentas
                        </div>
                        <div className="space-y-1">
                          <Link
                            href="/calculadora"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-5 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-3">
                              <LineChart className="w-4 h-4 text-brand-teal" />
                              <span>Calculadora de financiamento</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                        </div>
                      </div>

                      {/* Serviços */}
                      <div>
                        <div className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Serviços
                        </div>
                        <div className="space-y-1">
                          <Link
                            href="/financing"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-5 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-3">
                              <Building2 className="w-4 h-4 text-brand-teal" />
                              <span>Financiamento imobiliário</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                          <Link
                            href="/owner/analytics"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-5 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-3">
                              <LineChart className="w-4 h-4 text-teal-600" />
                              <span>Análise de mercado</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                          <Link
                            href="/realtor"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-5 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-3">
                              <Users className="w-4 h-4 text-brand-teal" />
                              <span>Encontrar corretor</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                        </div>
                      </div>

                      {/* Minha conta */}
                      <div>
                        <div className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Minha conta
                        </div>
                        <div className="space-y-1">
                          <Link
                            href="/saved-searches"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-5 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-3">
                              <Bookmark className="w-4 h-4 text-brand-teal" />
                              <span>Buscas salvas</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                          <Link
                            href="/favorites"
                            onClick={() => setIsLeftMenuOpen(false)}
                            className="flex items-center justify-between px-5 py-2 text-sm text-gray-800 hover:bg-gray-100"
                          >
                            <span className="flex items-center gap-3">
                              <Heart className="w-4 h-4 text-brand-teal" />
                              <span>Meus favoritos</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
              className="md:hidden fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white/95 backdrop-blur-xl z-[9999] shadow-2xl flex flex-col"
            >
              <div className="px-5 py-4 border-b border-gray-100/80 flex items-center justify-between bg-brand-gradient text-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-semibold">
                    {session ? (session as any)?.user?.name?.[0]?.toUpperCase() || 'U' : 'Z'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold tracking-wide">Minha conta</span>
                    <span className="text-xs text-teal-50/90">
                      {session ? 'Favoritos, buscas e painéis' : 'Entre para salvar imóveis e buscas'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsRightMenuOpen(false)} className="p-2 rounded-full hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3">
                {session ? (
                  <>
                    <Link href="/favorites" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                      Favoritos
                    </Link>
                    <Link href="/saved-searches" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                      Buscas salvas
                    </Link>

                    {role === 'USER' && (
                      <Link
                        href="/chats"
                        onClick={() => setIsRightMenuOpen(false)}
                        className="flex items-center gap-3 px-6 py-3 text-base font-semibold text-gray-900 border-b"
                      >
                        <MessageCircle className="w-5 h-5 text-brand-teal" />
                        Conversas
                      </Link>
                    )}
                    
                    {role === 'OWNER' && (
                      <>
                        <Link href="/owner/dashboard" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Dashboard
                        </Link>
                        <Link href="/owner/properties" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Meus anúncios
                        </Link>
                        <Link href="/owner/leads" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Meus leads
                        </Link>
                      </>
                    )}

                    {role === 'REALTOR' && (
                      <>
                        <Link href="/broker/dashboard" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Painel
                        </Link>
                        <Link href="/broker/leads" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Leads
                        </Link>
                        <Link href="/broker/properties" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Imóveis
                        </Link>
                      </>
                    )}

                    {role === 'AGENCY' && (
                      <>
                        <Link href="/agency" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Painel
                        </Link>
                        <Link href="/agency/leads" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Leads
                        </Link>
                        <Link href="/agency/team" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Meu time
                        </Link>
                        <Link href="/agency/properties" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Imóveis
                        </Link>
                        <Link href="/owner/new" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Cadastrar imóvel
                        </Link>
                      </>
                    )}

                    {role === 'ADMIN' && (
                      <>
                        <Link href="/admin" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Painel Admin
                        </Link>
                        <Link href="/admin/properties" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Gerenciar imóveis
                        </Link>
                        <Link href="/admin/users" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                          Usuários
                        </Link>
                      </>
                    )}

                    <Link href="/profile" onClick={() => setIsRightMenuOpen(false)} className="block px-6 py-3 text-base font-semibold text-gray-900 border-b">
                      Configurações da conta
                    </Link>

                    <button
                      onClick={() => {
                        setIsRightMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="w-full text-left px-6 py-3 text-base font-semibold text-gray-900 border-b"
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
                    className="w-full text-left px-6 py-3 text-base font-semibold text-brand-teal"
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
