"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Kanban,
  LayoutDashboard,
  Clock,
  MessageCircle,
  MessageSquare,
  Sparkles,
  Home,
  UserRound,
  ClipboardList,
} from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import RealtorAssistantWidget from "@/components/crm/RealtorAssistantWidget";
import CollapsibleSidebarNav, { type SidebarNavItem } from "@/components/workspace/CollapsibleSidebarNav";
import { getPusherClient } from "@/lib/pusher-client";

type NavItem = SidebarNavItem & {
  badgeKey?: keyof BrokerNavMetrics;
};

type BrokerNavMetrics = {
  unreadChats: number;
  assistantOpen: number;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/broker/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/broker/properties", label: "Imóveis", icon: Home },
  { href: "/broker/leads", label: "Leads", icon: ClipboardList },
  { href: "/broker/chats", label: "Conversas", icon: MessageSquare, badgeKey: "unreadChats" },
  { href: "/broker/crm", label: "Funil", icon: Kanban },
  { href: "/broker/assistant", label: "Assistente", icon: Sparkles, badgeKey: "assistantOpen" },
  { href: "/broker/assistant/offline", label: "Assistente offline", icon: Clock },
  { href: "/broker/teams", label: "Chat do time", icon: MessageCircle },
  { href: "/profile?onboarding=broker", label: "Perfil profissional", icon: UserRound },
];

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  const clean = pathname.split("?")[0] || "/";
  if (clean !== "/" && clean.endsWith("/")) return clean.slice(0, -1);
  return clean;
}

function isActiveHref(pathname: string, href: string) {
  const p = normalizePath(pathname);
  const h = normalizePath(href);

  if (h === "/broker/dashboard") {
    return p === "/broker" || p === "/broker/dashboard";
  }

  if (h === "/broker/leads") {
    return p === "/broker/leads" || p.startsWith("/broker/leads/");
  }

  if (h === "/broker/teams") {
    return p === "/broker/teams" || p.startsWith("/broker/teams/");
  }

  if (h === "/broker/properties") {
    return p === "/broker/properties" || p.startsWith("/broker/properties/");
  }

  return p === h || p.startsWith(`${h}/`);
}

function sectionFromPath(pathname: string) {
  const p = normalizePath(pathname);

  if (p === "/broker" || p === "/broker/dashboard") {
    return {
      title: "Painel do corretor",
      description: "Acompanhe desempenho, leads e próximos passos do seu funil.",
      crumb: "Painel",
    };
  }

  if (p.startsWith("/broker/leads")) {
    return {
      title: "Leads",
      description: "Sua lista de oportunidades com tarefas, contatos e status.",
      crumb: "Leads",
    };
  }

  if (p === "/broker/crm") {
    return {
      title: "Funil de vendas",
      description: "Organize o pipeline completo com drag & drop.",
      crumb: "Funil",
    };
  }

  if (p.startsWith("/broker/chats")) {
    return {
      title: "Conversas com clientes",
      description: "Responda mensagens e acompanhe cada lead em tempo real.",
      crumb: "Conversas",
    };
  }

  if (p.startsWith("/broker/assistant")) {
    return {
      title: "Assistente",
      description: "Pendências inteligentes e sugestões para acelerar seu trabalho.",
      crumb: "Assistente",
    };
  }

  if (p.startsWith("/broker/teams")) {
    return {
      title: "Chat do time",
      description: "Converse com a imobiliária e o time interno.",
      crumb: "Chat do time",
    };
  }

  if (p.startsWith("/broker/properties")) {
    return {
      title: "Imóveis",
      description: "Gestão do seu estoque e performance por anúncio.",
      crumb: "Imóveis",
    };
  }

  if (p.startsWith("/broker/profile")) {
    return {
      title: "Perfil profissional",
      description: "Esta rota agora encaminha você para a área central de perfil.",
      crumb: "Perfil",
    };
  }

  if (p.startsWith("/broker/messages")) {
    return {
      title: "Mensagens internas",
      description: "Comunicações internas vinculadas a leads.",
      crumb: "Mensagens",
    };
  }

  return {
    title: "Corretor",
    description: "",
    crumb: "Corretor",
  };
}

export default function BrokerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const section = useMemo(() => sectionFromPath(pathname), [pathname]);
  const [metrics, setMetrics] = useState<BrokerNavMetrics | null>(null);
  const { data: session } = useSession();
  const realtorId = (session as any)?.user?.id || (session as any)?.userId || "";

  const fetchMetrics = useCallback(async () => {
    try {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const response = await fetch("/api/broker/nav-metrics", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success && data.metrics) {
        setMetrics({
          unreadChats: Number(data.metrics.unreadChats || 0),
          assistantOpen: Number(data.metrics.assistantOpen || 0),
        });
        return;
      }
      setMetrics(null);
    } catch (error) {
      console.error("Error fetching broker nav metrics:", error);
      setMetrics(null);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const onFocus = () => fetchMetrics();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchMetrics();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(fetchMetrics, 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [fetchMetrics]);

  useEffect(() => {
    if (!realtorId) return;

    let cancelled = false;
    try {
      const pusher = getPusherClient();
      const channelName = `private-realtor-${String(realtorId)}`;
      const channel = pusher.subscribe(channelName);

      const handler = () => {
        if (cancelled) return;
        fetchMetrics();
      };

      channel.bind("assistant:item_updated", handler as any);
      channel.bind("assistant:items_recalculated", handler as any);
      channel.bind("new-chat-message", handler as any);
      channel.bind("lead-chat-read-receipt", handler as any);

      return () => {
        cancelled = true;
        try {
          channel.unbind("assistant:item_updated", handler as any);
          channel.unbind("assistant:items_recalculated", handler as any);
          channel.unbind("new-chat-message", handler as any);
          channel.unbind("lead-chat-read-receipt", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      };
    } catch {
      return;
    }
  }, [fetchMetrics, realtorId]);

  const headerAction = useMemo(() => {
    const normalized = normalizePath(pathname);
    if (normalized.startsWith("/broker/leads")) {
      return { href: "/broker/crm", label: "Ver funil" };
    }
    if (normalized === "/broker/crm") {
      return { href: "/broker/leads", label: "Ver lista" };
    }
    return null;
  }, [pathname]);

  const renderBadge = (item: NavItem) => {
    if (!item.badgeKey || !metrics) return null;
    const value = metrics[item.badgeKey] || 0;
    if (value <= 0) return null;

    if (item.badgeKey === "unreadChats") {
      return (
        <span className="absolute right-2.5 top-2 text-[11px] font-extrabold text-red-600 tabular-nums md:static md:ml-1">
          {value > 99 ? "99+" : value}
        </span>
      );
    }

    return (
      <span className="absolute right-2 top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white md:static md:ml-auto">
        {value > 99 ? "99+" : value}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-50">
      <ModernNavbar />
      <RealtorAssistantWidget />
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-6">
        <div
          className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-white/60 backdrop-blur shadow-soft"
        >
          <div className="absolute -top-28 -right-28 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />

          <div className="relative p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-5">
              <CollapsibleSidebarNav
                items={NAV_ITEMS}
                pathname={pathname}
                storageKey="oggahub_sidebar_collapsed_broker"
                workspaceLabel="Corretor"
                isItemActive={(currentPath, item) => isActiveHref(currentPath, item.href)}
                renderBadge={(item) => renderBadge(item)}
              />

              <div className="flex-1 min-w-0">
                <div className="pb-5 border-b border-gray-200/70">
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-gray-500">
                      <Link href="/" className="hover:text-gray-700 font-semibold">
                        Home
                      </Link>
                      <span className="mx-2">/</span>
                      <Link href="/broker/dashboard" className="hover:text-gray-700 font-semibold">
                        Corretor
                      </Link>
                      {section.crumb && section.crumb !== "Corretor" && (
                        <>
                          <span className="mx-2">/</span>
                          <span className="text-gray-700 font-semibold">{section.crumb}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold gradient-text">{section.title}</h1>
                        {section.description ? <p className="mt-1 text-sm text-gray-600">{section.description}</p> : null}
                      </div>
                      {headerAction ? (
                        <Link
                          href={headerAction.href}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {headerAction.label}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
