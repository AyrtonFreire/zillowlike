"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Kanban, Home, UserRound, MessageSquare } from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import { AgencyAssistantWidget } from "@/components/crm/AgencyAssistantWidget";

type NavItem = {
  href: string;
  label: string;
  icon: any;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/agency", label: "Painel", icon: LayoutDashboard },
  { href: "/agency/team", label: "Time", icon: Users },
  { href: "/agency/leads", label: "Leads", icon: Kanban },
  { href: "/agency/clients", label: "Clientes", icon: UserRound },
  { href: "/agency/properties", label: "Imóveis", icon: Home },
  { href: "/agency/team-chat", label: "Chat do time", icon: MessageSquare },
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

  if (h === "/agency") {
    if (p === "/agency") return true;
    return false;
  }

  if (h === "/agency/leads") {
    if (p.startsWith("/agency/teams/") && p.includes("/crm")) return true;
    if (p === "/agency/leads") return true;
    return false;
  }

  return p === h || p.startsWith(`${h}/`);
}

function sectionFromPath(pathname: string) {
  const p = normalizePath(pathname);

  if (p === "/agency") {
    return {
      title: "Painel da Agência",
      description: "Organize corretores, acompanhe leads e mantenha o funil em ordem.",
      crumb: "Painel",
    };
  }

  if (p === "/agency/team") {
    return {
      title: "Time",
      description: "Membros, convites, regras e distribuição de leads.",
      crumb: "Time",
    };
  }

  if (p === "/agency/properties") {
    return {
      title: "Imóveis",
      description: "Estoque do time associado à sua agência.",
      crumb: "Imóveis",
    };
  }

  if (p === "/agency/team-chat") {
    return {
      title: "Chat do time",
      description: "Converse com cada integrante do time em canais dedicados.",
      crumb: "Chat do time",
    };
  }

  if (p === "/agency/leads" || (p.startsWith("/agency/teams/") && p.includes("/crm"))) {
    return {
      title: "Leads",
      description: "Acompanhe o funil do time e distribua responsáveis.",
      crumb: "Leads",
    };
  }

  if (p === "/agency/clients" || p.startsWith("/agency/clients/")) {
    return {
      title: "Clientes",
      description: "Preferências, matches e links para compartilhar imóveis.",
      crumb: "Clientes",
    };
  }

  return {
    title: "Agência",
    description: "",
    crumb: "Agência",
  };
}

export default function AgencyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const section = useMemo(() => sectionFromPath(pathname), [pathname]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-50">
      <ModernNavbar />
      <AgencyAssistantWidget />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-white/60 backdrop-blur shadow-soft">
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
                          className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1.5 md:gap-2 px-2.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all border ${
                            active
                              ? "glass-teal text-white border-transparent shadow-md"
                              : "bg-white/60 text-gray-700 border-transparent hover:bg-white hover:shadow-sm"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-600"}`} />
                          <span className="leading-none">{item.label}</span>
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
                      <Link href="/agency" className="hover:text-gray-700 font-semibold">
                        Agência
                      </Link>
                      {section.crumb && section.crumb !== "Agência" && (
                        <>
                          <span className="mx-2">/</span>
                          <span className="text-gray-700 font-semibold">{section.crumb}</span>
                        </>
                      )}
                    </div>

                    <div>
                      <h1 className="text-2xl sm:text-3xl font-semibold gradient-text">{section.title}</h1>
                      {section.description ? <p className="mt-1 text-sm text-gray-600">{section.description}</p> : null}
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
