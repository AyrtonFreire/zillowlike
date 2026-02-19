"use client";

import { motion, useScroll, AnimatePresence } from "framer-motion";
import { Menu, X, User, Heart, Bell, MessageCircle, LogOut, ChevronDown, LayoutDashboard, Building2, ClipboardList, Users, Wrench, LineChart, Megaphone, Star, Settings, Bookmark, Home, HelpCircle, Building, LandPlot, Trees, Store, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import MobileHeaderZillow from "./MobileHeaderZillow";
import HowItWorksModal from "./HowItWorksModal";
import { getPusherClient } from "@/lib/pusher-client";

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
  const buyButtonRef = useRef<HTMLButtonElement | null>(null);
  const rentButtonRef = useRef<HTMLButtonElement | null>(null);
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const role = (session as any)?.user?.role || (session as any)?.role || "USER";
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [hasUnreadUserChats, setHasUnreadUserChats] = useState(false);
  const [assistantActiveCount, setAssistantActiveCount] = useState(0);
  const assistantEtagRef = useRef<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const navVariant = searchParams?.get("nav") ?? "3";
  const enableDropdown = navVariant !== "2";
  const useCompactPopover = navVariant === "3";
  const [menuAnchorLeft, setMenuAnchorLeft] = useState(0);
  const [menuAnchorCenter, setMenuAnchorCenter] = useState(0);

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

  useEffect(() => {
    if (openMenu !== "comprar" && openMenu !== "alugar") return;

    const updateLeft = () => {
      const navEl = navRef.current;
      const buttonEl = openMenu === "comprar" ? buyButtonRef.current : rentButtonRef.current;
      if (!navEl || !buttonEl) return;

      const navRect = navEl.getBoundingClientRect();
      const buttonRect = buttonEl.getBoundingClientRect();
      const left = Math.max(0, buttonRect.left - navRect.left);
      setMenuAnchorLeft(left);
      setMenuAnchorCenter(Math.max(0, left + buttonRect.width / 2));
    };

    updateLeft();
    window.addEventListener("resize", updateLeft);
    return () => window.removeEventListener("resize", updateLeft);
  }, [openMenu]);

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
    let interval: any;
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
    interval = setInterval(updateUnread, 300000);

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
    let interval: any;

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
    interval = setInterval(updateAssistantCount, 600000);

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
  // Mega menu Comprar - inspirado em Zillow/Daft/James Edition
  const buyMenuSections = [
    {
      title: "Por tipo de imóvel",
      items: [
        { label: "Casas", href: "/explore/buy?type=HOUSE", description: "Casas unifamiliares", icon: Home },
        { label: "Apartamentos", href: "/explore/buy?type=APARTMENT", description: "Apartamentos e flats", icon: Building },
        { label: "Condomínios", href: "/explore/buy?type=CONDO", description: "Condomínios fechados", icon: Building2 },
        { label: "Terrenos", href: "/explore/buy?type=LAND", description: "Lotes e terrenos", icon: LandPlot },
        { label: "Imóvel rural", href: "/explore/buy?type=RURAL", description: "Fazendas e sítios", icon: Trees },
        { label: "Comercial", href: "/explore/buy?type=COMMERCIAL", description: "Imóveis comerciais", icon: Store },
      ],
    },
  ];

  const buyMenuMedia = [
    {
      title: "Casas em destaque",
      subtitle: "Explore opções para comprar",
      href: "/explore/buy",
      image:
        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "Bairros populares",
      subtitle: "Veja regiões da sua cidade",
      href: "/explore/buy",
      image:
        "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "Comparar imóveis",
      subtitle: "Salve favoritos para decidir",
      href: "/favorites",
      image:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
    },
  ];

  // Mega menu Alugar - inspirado em Zillow/Daft/James Edition
  const rentMenuSections = [
    {
      title: "Por tipo de imóvel",
      items: [
        { label: "Casas", href: "/explore/rent?type=HOUSE", description: "Casas para locação", icon: Home },
        { label: "Apartamentos", href: "/explore/rent?type=APARTMENT", description: "Apartamentos para alugar", icon: Building },
        { label: "Condomínios", href: "/explore/rent?type=CONDO", description: "Condomínios fechados", icon: Building2 },
        { label: "Terrenos", href: "/explore/rent?type=LAND", description: "Lotes e terrenos", icon: LandPlot },
        { label: "Imóvel rural", href: "/explore/rent?type=RURAL", description: "Fazendas e sítios", icon: Trees },
        { label: "Comercial", href: "/explore/rent?type=COMMERCIAL", description: "Imóveis comerciais", icon: Store },
      ],
    },
  ];

  const rentMenuMedia = [
    {
      title: "Apartamentos",
      subtitle: "Ofertas para alugar",
      href: "/explore/rent?type=APARTMENT",
      image:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "Casas",
      subtitle: "Mais espaço para viver",
      href: "/explore/rent?type=HOUSE",
      image:
        "https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "Favoritos",
      subtitle: "Salve e compare",
      href: "/favorites",
      image:
        "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
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
  const compactPopoverClass =
    "absolute top-full z-[300] mt-3 w-[560px] max-w-[92vw] rounded-[28px] border border-white/30 bg-white/80 backdrop-blur-2xl shadow-[0_40px_120px_rgba(0,0,0,0.35)] ring-1 ring-black/10 overflow-hidden";

  const heroMegaMenuWideClass =
    "absolute top-full left-1/2 z-[300] mt-3 w-[1040px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-[32px] border border-gray-200/80 bg-white shadow-[0_50px_140px_rgba(15,23,42,0.28)] ring-1 ring-black/5 overflow-hidden";
  const heroMegaMenuCompactClass =
    "absolute top-full z-[300] mt-3 w-[920px] max-w-[calc(100vw-32px)] rounded-[32px] border border-gray-200/80 bg-white shadow-[0_50px_140px_rgba(15,23,42,0.28)] ring-1 ring-black/5 overflow-hidden";

  const splitMenuItems = <T,>(items: T[]) => {
    const mid = Math.ceil(items.length / 2);
    return [items.slice(0, mid), items.slice(mid)];
  };

  const renderHeroMegaMenu = (opts: {
    title: string;
    sectionTitle: string;
    items: Array<{ label: string; href: string; description?: string }>;
    media: Array<{ title: string; subtitle: string; href: string; image: string }>;
    onNavigate: () => void;
  }) => {
    const [col1, col2] = splitMenuItems(opts.items);

    return (
      <div className="p-7">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
          {opts.title}
        </div>
        <div className="mt-6 grid grid-cols-[1.1fr_0.9fr] gap-10">
          <div className="grid grid-cols-2 gap-10">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                {opts.sectionTitle}
              </div>
              <ul className="mt-4 space-y-1">
                {col1.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={opts.onNavigate}
                      className="group flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-teal-800">
                          {item.label}
                        </div>
                        {item.description ? (
                          <div className="text-xs text-gray-600 leading-snug">
                            {item.description}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Mais opções</div>
              <ul className="mt-4 space-y-1">
                {col2.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={opts.onNavigate}
                      className="group flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-teal-800">
                          {item.label}
                        </div>
                        {item.description ? (
                          <div className="text-xs text-gray-600 leading-snug">
                            {item.description}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {opts.media.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                onClick={opts.onNavigate}
                className="group relative isolate flex h-[210px] flex-col justify-end overflow-hidden rounded-3xl ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.18)]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${card.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/5" />
                <div className="relative p-4">
                  <div className="text-sm font-semibold text-white">{card.title}</div>
                  <div className="mt-0.5 text-xs text-white/85">{card.subtitle}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
            ? "bg-brand-gradient shadow-md"
            : forceLight
            ? "bg-white shadow-md"
            : "bg-transparent"
        }`}
      >
        <AnimatePresence>
          {enableDropdown && (openMenu === "comprar" || openMenu === "alugar") && (
            <motion.div
              key="nav-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="fixed left-0 right-0 bottom-0 top-16 z-[250] bg-black/30 backdrop-blur-[1px]"
              onMouseDown={() => setOpenMenu(null)}
            />
          )}
        </AnimatePresence>
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-3 items-center h-16">
            {/* Left: Primary tabs with dropdowns (Desktop) */}
            <div className="flex items-center justify-start gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl transition-colors ${
                  forceLight ? 'bg-teal-600 text-white' : 'bg-white/20 backdrop-blur text-white'
                }`}>
                  O
                </div>
                <span className={`hidden lg:block text-xl font-bold transition-colors ${
                  forceLight ? 'text-gray-900' : 'text-white'
                }`}>OggaHub</span>
              </Link>
            </div>

            {/* Center: Logo */}
            <div className="flex items-center justify-center gap-7">
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-7">
              <div
                className=""
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
                  ref={buyButtonRef}
                  onClick={() => {
                    setOpenMenu(null);
                    setPrimary('comprar');
                    router.push('/explore/buy');
                  }}
                  className={`flex items-center gap-1 font-semibold text-[15px] transition-colors relative group ${
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
                      initial={{ opacity: 0, y: -10, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.99 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className={useCompactPopover ? heroMegaMenuCompactClass : heroMegaMenuWideClass}
                      style={useCompactPopover ? { left: menuAnchorLeft } : undefined}
                      onMouseEnter={() => {
                        clearHoverTimeout();
                      }}
                      onMouseLeave={() => {
                        scheduleCloseMenu();
                      }}
                    >
                      {renderHeroMegaMenu({
                        title: "Explorar para comprar",
                        sectionTitle: buyMenuSections[0]?.title ?? "",
                        items: buyMenuSections[0]?.items ?? [],
                        media: buyMenuMedia,
                        onNavigate: () => {
                          setOpenMenu(null);
                          setPrimary("comprar");
                        },
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                className=""
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
                  ref={rentButtonRef}
                  onClick={() => {
                    setOpenMenu(null);
                    setPrimary('alugar');
                    router.push('/explore/rent');
                  }}
                  className={`flex items-center gap-1 font-semibold text-[15px] transition-colors relative group ${
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
                      initial={{ opacity: 0, y: -10, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.99 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className={useCompactPopover ? heroMegaMenuCompactClass : heroMegaMenuWideClass}
                      style={useCompactPopover ? { left: menuAnchorLeft } : undefined}
                      onMouseEnter={() => {
                        clearHoverTimeout();
                      }}
                      onMouseLeave={() => {
                        scheduleCloseMenu();
                      }}
                    >
                      {renderHeroMegaMenu({
                        title: "Explorar para alugar",
                        sectionTitle: rentMenuSections[0]?.title ?? "",
                        items: rentMenuSections[0]?.items ?? [],
                        media: rentMenuMedia,
                        onNavigate: () => {
                          setOpenMenu(null);
                          setPrimary("alugar");
                        },
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/start"
                className={`whitespace-nowrap font-semibold text-[15px] transition-colors relative group ${
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
                                  prefetch={false}
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

            {role === 'USER' && session && (
              <Link
                href="/chats"
                className={`relative p-2 rounded-lg transition-colors ${
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
                className={`relative p-2 rounded-lg transition-colors ${
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-white/10`}
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-medium text-sm">
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  </button>
                  {userMenuOpen && (
                    <div
                      id="user-menu-dropdown"
                      className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-16px)] bg-white rounded-xl border border-gray-200 shadow-xl z-[20000]"
                    >
                      <ul className="py-1 text-sm text-gray-800">
                        {role === 'OWNER' && (
                          <>
                            <li><Link href="/owner/dashboard" className="block px-4 py-2 hover:bg-gray-50">Dashboard</Link></li>
                            <li><Link href="/owner/properties" className="block px-4 py-2 hover:bg-gray-50">Meus anúncios</Link></li>
                            <li><Link href="/owner/leads" className="block px-4 py-2 hover:bg-gray-50">Meus leads</Link></li>
                            <li><hr className="my-1" /></li>
                          </>
                        )}

                        {role === 'REALTOR' && (
                          <>
                            <li><Link href="/broker/dashboard" className="block px-4 py-2 hover:bg-gray-50">CRM</Link></li>
                            <li><hr className="my-1" /></li>
                          </>
                        )}

                        {role === 'AGENCY' && (
                          <>
                            <li><Link href="/agency" className="block px-4 py-2 hover:bg-gray-50">CRM</Link></li>
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
