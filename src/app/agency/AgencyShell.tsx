"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Kanban, Home, UserRound, MessageSquare } from "lucide-react";
import { ModernNavbar } from "@/components/modern";
import CollapsibleSidebarNav, { type SidebarNavItem } from "@/components/workspace/CollapsibleSidebarNav";
import AgencyIdentityBadge from "@/components/agency/AgencyIdentityBadge";

const NAV_ITEMS: SidebarNavItem[] = [
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

const AGENCY_NAME_CACHE_KEY = "oggahub_agency_identity_v1";

export default function AgencyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const section = useMemo(() => sectionFromPath(pathname), [pathname]);
  const [agencyName, setAgencyName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const cached = sessionStorage.getItem(AGENCY_NAME_CACHE_KEY);
      if (cached) setAgencyName(cached);
    } catch {
      // ignore
    }
    (async () => {
      try {
        const res = await fetch("/api/teams", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) return;
        const teams: Array<{ name?: string }> = Array.isArray(data.teams) ? data.teams : [];
        const name = teams[0]?.name?.trim();
        if (!cancelled && name) {
          setAgencyName(name);
          try {
            sessionStorage.setItem(AGENCY_NAME_CACHE_KEY, name);
          } catch {
            // ignore
          }
        }
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-50">
      <ModernNavbar />
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-6">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-white/60 backdrop-blur shadow-soft">
          <div className="absolute -top-28 -right-28 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />

          <div className="relative p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-5">
              <div className="md:flex-shrink-0">
                {agencyName ? <AgencyIdentityBadge /> : null}
                <CollapsibleSidebarNav
                  items={NAV_ITEMS}
                  pathname={pathname}
                  storageKey="oggahub_sidebar_collapsed_agency"
                  workspaceLabel={agencyName || "Imobiliária"}
                  isItemActive={(currentPath, item) => isActiveHref(currentPath, item.href)}
                />
              </div>

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
