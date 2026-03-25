"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, Bell, MessageCircle, ChevronDown, Building2, ClipboardList, LineChart, Megaphone, Home, HelpCircle, Building, LandPlot, Trees, Store, MapPin } from "lucide-react";
import { useState, useEffect, useRef, type ComponentType } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import MobileHeaderZillow from "./MobileHeaderZillow";
import { getPusherClient } from "@/lib/pusher-client";
import BrandLogo from "@/components/BrandLogo";

interface ModernNavbarProps {
  forceLight?: boolean;
}

export default function ModernNavbar({ forceLight = false }: ModernNavbarProps = {}) {
  const [primary, setPrimary] = useState<"comprar" | "alugar" | "anunciar" | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<"comprar" | "alugar" | "recursos" | null>(null);
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const role = (session as any)?.user?.role || (session as any)?.role || "USER";
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadUserChats, setHasUnreadUserChats] = useState(false);
  const [assistantActiveCount, setAssistantActiveCount] = useState(0);
  const assistantEtagRef = useRef<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navVariant = searchParams?.get("nav") ?? "3";
  const enableDropdown = navVariant !== "2";

  const clearHoverTimeout = () => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
  };

  const scheduleCloseMenu = () => {
    clearHoverTimeout();
    hoverCloseTimeoutRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 140);
  };

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
    if (role !== 'REALTOR' && role !== 'ADMIN') return;

    let cancelled = false;
    let lastEtag: string | null = null;

    const STORAGE_PREFIX = 'zlw_inbox_last_read_';

    const updateUnread = async () => {
      try {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        const response = await fetch('/api/broker/messages/inbox?mode=unread', {
          headers: lastEtag ? { 'if-none-match': lastEtag } : undefined,
        });

        if (response.status === 304) {
          return;
        }

        lastEtag = response.headers.get('etag') || lastEtag;
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
    const interval = setInterval(updateUnread, 300000);

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      updateUnread();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [session, role]);

  // Inbox de conversas para usuário comum - verifica se há mensagens novas (vindas do profissional)
  useEffect(() => {
    if (!session) return;
    if (role !== 'USER') {
      setHasUnreadUserChats(false);
      return;
    }

    let cancelled = false;
    const STORAGE_PREFIX = 'zlw_user_chat_last_read_';

    const updateUnread = async () => {
      try {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        const response = await fetch('/api/chats');
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success || !Array.isArray(data.chats)) {
          if (!cancelled) setHasUnreadUserChats(false);
          return;
        }

        let anyUnread = false;
        if (typeof window !== 'undefined') {
          for (const chat of data.chats) {
            const leadId = String(chat.leadId || '');
            if (!leadId) continue;

            const lastMessageAt = chat.lastMessageAt as string | undefined;
            const lastMessageFromClient = chat.lastMessageFromClient as boolean | undefined;

            // Para o usuário (cliente), consideramos "não lido" quando a última mensagem foi do profissional.
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
        }

        if (!cancelled) setHasUnreadUserChats(anyUnread);

        try {
          if (typeof window !== 'undefined') {
            (window as any).__zlw_provider_user_chat_unread = true;
            (window as any).__zlw_has_unread_user_chats = anyUnread;
            window.dispatchEvent(new CustomEvent('zlw-user-chat-unread', { detail: { unread: anyUnread } }));
          }
        } catch {
        }
      } catch (error) {
        console.error('Error checking unread user chats:', error);
        if (!cancelled) setHasUnreadUserChats(false);
      }
    };

    updateUnread();
    const interval = setInterval(updateUnread, 300000);

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      updateUnread();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [session, role]);

  useEffect(() => {
    if (!session) return;
    if (role !== 'REALTOR' && role !== 'ADMIN') return;

    const userId = (session as any)?.user?.id || (session as any)?.userId;
    if (!userId) return;

    let cancelled = false;

    const updateAssistantCount = async () => {
      try {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        const response = await fetch('/api/assistant/count',
          assistantEtagRef.current
            ? {
                headers: { 'if-none-match': assistantEtagRef.current },
              }
            : undefined
        );

        if (response.status === 304) {
          return;
        }

        const nextEtag = response.headers.get('etag');
        if (nextEtag) assistantEtagRef.current = nextEtag;

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success || typeof data.activeCount !== 'number') {
          if (!cancelled) setAssistantActiveCount(0);
          return;
        }

        if (!cancelled) {
          setAssistantActiveCount(data.activeCount);
          try {
            if (typeof window !== 'undefined') {
              (window as any).__zlw_provider_assistant_count = true;
              (window as any).__zlw_assistant_active_count = data.activeCount;
              window.dispatchEvent(new CustomEvent('zlw-assistant-count', { detail: { count: data.activeCount } }));
            }
          } catch {
          }
        }
      } catch {
        if (!cancelled) setAssistantActiveCount(0);
      }
    };

    updateAssistantCount();
    const interval = setInterval(updateAssistantCount, 600000);

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      updateAssistantCount();
    };
    const onFocus = () => updateAssistantCount();
    const onForceRefresh = () => updateAssistantCount();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('zlw-assistant-force-refresh', onForceRefresh as any);

    try {
      const pusher = getPusherClient();
      const channelName = `private-realtor-${userId}`;
      const channel = pusher.subscribe(channelName);

      const handler = () => {
        if (cancelled) return;
        updateAssistantCount();
      };

      channel.bind('assistant:item_updated', handler as any);
      channel.bind('assistant:items_recalculated', handler as any);

      return () => {
        cancelled = true;
        clearInterval(interval);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('zlw-assistant-force-refresh', onForceRefresh as any);
        try {
          channel.unbind('assistant:item_updated', handler as any);
          channel.unbind('assistant:items_recalculated', handler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      };
    } catch {
      return () => {
        cancelled = true;
        clearInterval(interval);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('zlw-assistant-force-refresh', onForceRefresh as any);
      };
    }
  }, [session, role]);
  const buyMenuEntry = {
    label: "Escolher cidade",
    href: "/explore/buy",
    icon: MapPin,
    description: "Explore bairros e regiões com uma navegação guiada.",
  };

  const buyMenuItems = [
    { label: "Casas", href: "/?purpose=SALE&type=HOUSE", icon: Home, accentClassName: "bg-sky-50 text-sky-700", description: "Residências e sobrados" },
    { label: "Apartamentos", href: "/?purpose=SALE&type=APARTMENT", icon: Building, accentClassName: "bg-indigo-50 text-indigo-700", description: "Apartamentos e flats" },
    { label: "Terrenos", href: "/?purpose=SALE&type=LAND", icon: LandPlot, accentClassName: "bg-amber-50 text-amber-700", description: "Lotes e áreas" },
    { label: "Condomínios", href: "/?purpose=SALE&type=CONDO", icon: Building2, accentClassName: "bg-violet-50 text-violet-700", description: "Opções em condomínio" },
    { label: "Imóvel rural", href: "/?purpose=SALE&type=RURAL", icon: Trees, accentClassName: "bg-emerald-50 text-emerald-700", description: "Sítios e fazendas" },
    { label: "Comercial", href: "/?purpose=SALE&type=COMMERCIAL", icon: Store, accentClassName: "bg-rose-50 text-rose-700", description: "Salas e pontos comerciais" },
  ];

  const rentMenuEntry = {
    label: "Escolher cidade",
    href: "/explore/rent",
    icon: MapPin,
    description: "Veja cidades, regiões e bairros para locação.",
  };

  const rentMenuItems = [
    { label: "Casas", href: "/?purpose=RENT&type=HOUSE", icon: Home, accentClassName: "bg-sky-50 text-sky-700", description: "Casas para morar" },
    { label: "Apartamentos", href: "/?purpose=RENT&type=APARTMENT", icon: Building, accentClassName: "bg-indigo-50 text-indigo-700", description: "Locações urbanas" },
    { label: "Terrenos", href: "/?purpose=RENT&type=LAND", icon: LandPlot, accentClassName: "bg-amber-50 text-amber-700", description: "Áreas e lotes" },
    { label: "Condomínios", href: "/?purpose=RENT&type=CONDO", icon: Building2, accentClassName: "bg-violet-50 text-violet-700", description: "Conforto e estrutura" },
    { label: "Imóvel rural", href: "/?purpose=RENT&type=RURAL", icon: Trees, accentClassName: "bg-emerald-50 text-emerald-700", description: "Espaços rurais" },
    { label: "Comercial", href: "/?purpose=RENT&type=COMMERCIAL", icon: Store, accentClassName: "bg-rose-50 text-rose-700", description: "Imóveis para operação" },
  ];

  const resourceColumns = [
    {
      title: "Para compradores",
      items: [
        { label: "Guia do comprador", href: "/guia/compra", icon: Home },
        { label: "Guia do inquilino", href: "/guia/locacao", icon: Home },
      ],
    },
    {
      title: "Para vendedores",
      items: [
        { label: "Guia do vendedor", href: "/guia/venda", icon: Megaphone },
        { label: "Financiamento imobiliário", href: "/financing", icon: Building2 },
      ],
    },
    {
      title: "Para corretores",
      items: [
        { label: "Como anunciar", href: "/como-anunciar", icon: HelpCircle },
        { label: "Calculadora de financiamento", href: "/calculadora", icon: LineChart },
      ],
    },
  ];

  const simpleDropdownClass =
    "absolute top-full left-1/2 z-[320] mt-4 w-[34rem] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-[34px] border border-white/60 bg-white/92 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.20)] backdrop-blur-2xl ring-1 ring-black/5";

  const simpleDropdownRightClass =
    "absolute top-full left-1/2 z-[320] mt-4 w-[46rem] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-[34px] border border-white/60 bg-white/92 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.20)] backdrop-blur-2xl ring-1 ring-black/5";

  const renderHeroCategoryMenu = (
    title: string,
    locationEntry: { label: string; href: string; icon: ComponentType<{ className?: string }>; description: string },
    items: Array<{ label: string; href: string; icon: ComponentType<{ className?: string }>; accentClassName: string; description: string }>,
    onNavigate: () => void
  ) => (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Explorar</p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">Escolha uma categoria para chegar mais rápido ao recorte ideal.</p>
        </div>
        <Link
          href={locationEntry.href}
          onClick={onNavigate}
          className="group hidden w-[15rem] flex-shrink-0 items-center gap-3 rounded-[26px] border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(13,148,136,0.10)] sm:flex"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-700 ring-1 ring-teal-100 transition-transform group-hover:scale-105">
            <locationEntry.icon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Entrada guiada</span>
            <span className="mt-1 block text-sm font-semibold text-gray-900">{locationEntry.label}</span>
          </span>
        </Link>
      </div>
      <Link
        href={locationEntry.href}
        onClick={onNavigate}
        className="group mt-4 flex items-center gap-3 rounded-[24px] border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(13,148,136,0.10)] sm:hidden"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-teal-700 ring-1 ring-teal-100 transition-transform group-hover:scale-105">
          <locationEntry.icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Entrada guiada</span>
          <span className="mt-1 block text-sm font-semibold text-gray-900">{locationEntry.label}</span>
        </span>
      </Link>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="group relative overflow-hidden rounded-[26px] border border-gray-200/90 bg-gradient-to-b from-white to-gray-50/90 p-4 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_18px_48px_rgba(15,23,42,0.10)]"
          >
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-black/5 transition-transform group-hover:scale-105 ${item.accentClassName}`}>
              <item.icon className="h-[18px] w-[18px]" />
            </span>
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-900">{item.label}</div>
              <div className="mt-1 text-xs leading-relaxed text-gray-500">{item.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  const renderResourcesMenu = (onNavigate: () => void) => (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Explorar</p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">Recursos</h3>
          <p className="mt-1 text-sm text-gray-500">Guias e ferramentas organizados por perfil para facilitar a descoberta.</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4">
        {resourceColumns.map((column) => (
          <div key={column.title} className="rounded-[28px] border border-gray-200/90 bg-gradient-to-b from-white to-gray-50/90 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">{column.title}</div>
            <div className="mt-3 space-y-2">
              {column.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className="group flex items-start gap-3 rounded-[20px] px-3 py-2.5 transition-all hover:bg-white hover:shadow-sm"
                  onClick={onNavigate}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-black/5 transition-transform group-hover:scale-105">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="pt-0.5 text-sm font-semibold text-gray-900 transition-transform group-hover:translate-x-0.5">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const isDashboardContext =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/owner") ||
    pathname?.startsWith("/broker") ||
    pathname?.startsWith("/agency");

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
            ? "bg-brand-gradient shadow-[0_18px_45px_rgba(2,22,22,0.18)]"
            : forceLight
            ? "border-b border-gray-200/80 bg-white/92 shadow-sm backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="grid grid-cols-3 items-center h-16">
            {/* Left: Primary tabs with dropdowns (Desktop) */}
            <div className="flex items-center justify-start gap-4">
              <BrandLogo
                tone={forceLight ? "dark" : "light"}
                size={40}
                wordmarkClassName="hidden lg:block text-xl font-semibold tracking-tight"
              />
            </div>

            {/* Center: Logo */}
            <div className="flex items-center justify-center gap-7">
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-7">
              <div
                className="relative"
                onMouseEnter={() => {
                  if (!enableDropdown) return;
                  clearHoverTimeout();
                  setPrimary('comprar');
                  setOpenMenu('comprar');
                }}
                onMouseLeave={() => {
                  if (!enableDropdown) return;
                  scheduleCloseMenu();
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    setPrimary('comprar');
                    router.push('/explore/buy');
                  }}
                  className={`group relative flex items-center gap-1 rounded-full px-3 py-2 text-[15px] font-semibold transition-colors ${
                    forceLight
                      ? (primary === 'comprar' ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900')
                      : (primary === 'comprar' ? 'text-white' : 'text-white/90 hover:text-white')
                  }`}
                >
                  <span>Comprar</span>
                  {enableDropdown && (
                    <ChevronDown className={`w-4 h-4 transition-transform ${openMenu === 'comprar' ? 'rotate-180' : ''}`} />
                  )}
                  <span className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
                    forceLight ? 'bg-teal-600' : 'bg-white'
                  } ${
                    primary === 'comprar' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </button>
                <AnimatePresence>
                  {enableDropdown && openMenu === "comprar" && (
                    <motion.div
                      key="buy-menu"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className={simpleDropdownClass}
                      onMouseEnter={() => {
                        clearHoverTimeout();
                      }}
                      onMouseLeave={() => {
                        scheduleCloseMenu();
                      }}
                    >
                      {renderHeroCategoryMenu("Comprar", buyMenuEntry, buyMenuItems, () => {
                        setOpenMenu(null);
                        setPrimary("comprar");
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                className="relative"
                onMouseEnter={() => {
                  if (!enableDropdown) return;
                  clearHoverTimeout();
                  setPrimary('alugar');
                  setOpenMenu('alugar');
                }}
                onMouseLeave={() => {
                  if (!enableDropdown) return;
                  scheduleCloseMenu();
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    setPrimary('alugar');
                    router.push('/explore/rent');
                  }}
                  className={`group relative flex items-center gap-1 rounded-full px-3 py-2 text-[15px] font-semibold transition-colors ${
                    forceLight
                      ? (primary === 'alugar' ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900')
                      : (primary === 'alugar' ? 'text-white' : 'text-white/90 hover:text-white')
                  }`}
                >
                  <span>Alugar</span>
                  {enableDropdown && (
                    <ChevronDown className={`w-4 h-4 transition-transform ${openMenu === 'alugar' ? 'rotate-180' : ''}`} />
                  )}
                  <span className={`absolute -bottom-1 left-0 h-0.5 transition-all duration-300 ${
                    forceLight ? 'bg-teal-600' : 'bg-white'
                  } ${
                    primary === 'alugar' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`} />
                </button>
                <AnimatePresence>
                  {enableDropdown && openMenu === "alugar" && (
                    <motion.div
                      key="rent-menu"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className={simpleDropdownClass}
                      onMouseEnter={() => {
                        clearHoverTimeout();
                      }}
                      onMouseLeave={() => {
                        scheduleCloseMenu();
                      }}
                    >
                      {renderHeroCategoryMenu("Alugar", rentMenuEntry, rentMenuItems, () => {
                        setOpenMenu(null);
                        setPrimary("alugar");
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/start"
                className={`group relative whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-semibold transition-colors ${
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

            <div
              className="relative hidden lg:block"
              onMouseEnter={() => setOpenMenu("recursos")}
            >
              <button 
                type="button"
                onClick={() => setOpenMenu("recursos")} 
                className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  forceLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <span>Recursos</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openMenu === 'recursos' ? 'rotate-180' : ''}`} />
              </button>
              {openMenu === "recursos" && (
                <div
                  className={simpleDropdownRightClass}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {renderResourcesMenu(() => setOpenMenu(null))}
                </div>
              )}
            </div>
            <Link 
              href="/favorites" 
              className={`rounded-xl p-2.5 transition-colors ${
                forceLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
              }`}
            >
              <Heart className="w-5 h-5" />
            </Link>

            {role === 'USER' && session && (
              <Link
                href="/chats"
                className={`relative rounded-xl p-2.5 transition-colors ${
                  forceLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                }`}
              >
                <Bell className="w-5 h-5" />
                {hasUnreadUserChats && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
                )}
              </Link>
            )}
            {(role === 'REALTOR' || role === 'ADMIN') && (
              <Link
                href="/broker/dashboard?assistant=1"
                className={`relative rounded-xl p-2.5 transition-colors ${
                  forceLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                }`}
              >
                <ClipboardList className="w-5 h-5" />
                {assistantActiveCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-white">
                    {assistantActiveCount > 99 ? '99+' : assistantActiveCount}
                  </span>
                )}
              </Link>
            )}
            {(role === 'REALTOR' || role === 'AGENCY' || role === 'ADMIN') && (
              <Link
                href="/broker/messages"
                className={`hidden relative p-2 rounded-lg transition-colors ${
                  forceLight ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                }`}
              >
                <Bell className="w-5 h-5" />
                {hasUnreadMessages && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
                )}
              </Link>
            )}
            </div>

            <div className="flex items-center justify-end gap-2">
              {session ? (
                <div className="relative" id="user-menu-trigger">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors ${forceLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-teal text-sm font-semibold text-white shadow-sm">
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  </button>
                  {userMenuOpen && (
                    <div
                      id="user-menu-dropdown"
                      className="absolute right-0 z-[20000] mt-2 w-64 max-w-[calc(100vw-16px)] rounded-2xl border border-gray-200 bg-white shadow-[0_24px_55px_rgba(15,23,42,0.18)]"
                    >
                      <div className="border-b border-gray-100 px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900 truncate">{session.user?.name || "Sua conta"}</div>
                        <div className="mt-1 text-xs text-gray-500 truncate">{session.user?.email || "Acesse suas preferências e atalhos"}</div>
                      </div>
                      <ul className="py-1 text-sm text-gray-800">
                        {role === 'OWNER' && (
                          <>
                            <li><Link href="/owner/dashboard" className="block px-4 py-2 hover:bg-gray-50">Painel do proprietário</Link></li>
                            <li><Link href="/owner/properties" className="block px-4 py-2 hover:bg-gray-50">Meus anúncios</Link></li>
                            <li><Link href="/owner/leads" className="block px-4 py-2 hover:bg-gray-50">Meus leads</Link></li>
                            <li><hr className="my-1" /></li>
                          </>
                        )}

                        {role === 'REALTOR' && (
                          <>
                            <li><Link href="/broker/dashboard" className="block px-4 py-2 hover:bg-gray-50">Painel do corretor</Link></li>
                            <li><hr className="my-1" /></li>
                          </>
                        )}

                        {role === 'AGENCY' && (
                          <>
                            <li><Link href="/agency" className="block px-4 py-2 hover:bg-gray-50">Painel da imobiliária</Link></li>
                            <li><Link href="/start" className="block px-4 py-2 hover:bg-gray-50">Cadastrar imóvel</Link></li>
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

                        {role === 'USER' && (
                          <>
                            <li>
                              <Link href="/chats" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50">
                                <MessageCircle className="w-4 h-4 text-gray-400" />
                                <span>Conversas</span>
                              </Link>
                            </li>
                            <li><hr className="my-1" /></li>
                          </>
                        )}
                        <li><Link href="/account" className="block px-4 py-2 hover:bg-gray-50">Minha conta</Link></li>
                        <li><Link href="/favorites" className="block px-4 py-2 hover:bg-gray-50">Favoritos</Link></li>
                        <li><Link href="/saved-searches" className="block px-4 py-2 hover:bg-gray-50">Buscas salvas</Link></li>
                        <li><hr className="my-1" /></li>
                        <li><button onClick={() => signOut({ callbackUrl: "/" })} className="w-full text-left px-4 py-2 hover:bg-gray-50">Sair</button></li>
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => signIn()}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${forceLight ? 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50' : 'bg-white/20 text-white backdrop-blur hover:bg-white/30'}`}
                >
                  Entrar
                </button>
              )}
            </div>

          {/* Mobile Menu Button (duplicated copy removed; controlled on the left) */}
          </div>
        </div>

      </motion.nav>
    </>
  );
}
