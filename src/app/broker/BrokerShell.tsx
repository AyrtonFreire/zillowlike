"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Kanban,
  LayoutDashboard,
  MessageCircle,
  MessageSquare,
  Sparkles,
  Users,
  Home,
  UserRound,
  ClipboardList,
} from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import RealtorAssistantWidget from "@/components/crm/RealtorAssistantWidget";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  badgeKey?: keyof BrokerNavMetrics;
};

type BrokerNavMetrics = {
  unreadChats: number;
  assistantOpen: number;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/broker/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/broker/leads", label: "Leads", icon: ClipboardList },
  { href: "/broker/crm", label: "Funil", icon: Kanban },
  { href: "/broker/chats", label: "Chats", icon: MessageSquare, badgeKey: "unreadChats" },
  { href: "/broker/assistant", label: "Assistente", icon: Sparkles, badgeKey: "assistantOpen" },
  { href: "/broker/teams", label: "Chat do time", icon: MessageCircle },
  { href: "/broker/properties", label: "Imóveis", icon: Home },
  { href: "/broker/profile", label: "Perfil", icon: UserRound },
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
      crumb: "Chats",
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
      title: "Perfil público",
      description: "Atualize seus dados e informações públicas.",
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
  const [assistantOpen, setAssistantOpen] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const response = await fetch("/api/broker/nav-metrics");
      const data = await response.json();
      if (response.ok && data?.success && data.metrics) {
        setMetrics({
          unreadChats: Number(data.metrics.unreadChats || 0),
          assistantOpen: Number(data.metrics.assistantOpen || 0),
        });
      }
    } catch (error) {
      console.error("Error fetching broker nav metrics:", error);
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
    const key = "zlw_realtor_assistant_widget_open";

    const readFromStorage = () => {
      try {
        setAssistantOpen(window.localStorage.getItem(key) === "1");
      } catch {
        setAssistantOpen(false);
      }
    };

    readFromStorage();

    const onAssistantEvent = (evt: Event) => {
      const anyEvt: any = evt as any;
      const open = anyEvt?.detail?.open;
      if (typeof open === "boolean") setAssistantOpen(open);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      setAssistantOpen(e.newValue === "1");
    };

    window.addEventListener("zlw-assistant-open", onAssistantEvent as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("zlw-assistant-open", onAssistantEvent as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

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
        <span className="ml-1 text-[11px] font-extrabold text-red-600 tabular-nums">
          {value > 99 ? "99+" : value}
        </span>
      );
    }

    return (
      <span className="md:ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
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
              <aside className="md:w-64 flex-shrink-0">
                <nav className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur p-2 md:p-3 shadow-sm">
                  <div className="grid grid-cols-4 md:grid-cols-1 gap-1">
                    {NAV_ITEMS.map((item) => {
                      const active = isActiveHref(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`relative flex flex-col md:flex-row items-center justify-center md:justify-start gap-1.5 md:gap-2 px-2.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all border ${
                            active
                              ? "glass-teal text-white border-transparent shadow-md"
                              : "bg-white/60 text-gray-700 border-transparent hover:bg-white hover:shadow-sm"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-600"}`} />
                          <span className="leading-none">{item.label}</span>
                          {renderBadge(item)}
                        </Link>
                      );
                    })}
                  </div>
                </nav>
              </aside>

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
