import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  MessageCircle,
  PlusCircle,
  Settings,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import type { SidebarNavItem } from "./CollapsibleSidebarNav";

export type DashboardSidebarConfig = {
  workspaceLabel: string;
  storageKey: string;
  items: SidebarNavItem[];
  isItemActive: (pathname: string, item: SidebarNavItem) => boolean;
};

export const OWNER_NAV_ITEMS: SidebarNavItem[] = [
  { href: "/owner/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/owner/properties", label: "Imóveis", icon: Home },
  { href: "/owner/leads", label: "Leads", icon: MessageCircle },
  { href: "/owner/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/owner/new", label: "Novo imóvel", icon: PlusCircle },
];

export const ADMIN_NAV_ITEMS: SidebarNavItem[] = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/properties", label: "Imóveis", icon: Home },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/leads", label: "Leads", icon: ClipboardList },
  { href: "/admin/queue", label: "Fila", icon: ArrowUpDown },
  { href: "/admin/queue-dashboard", label: "Distribuição", icon: BarChart3 },
  { href: "/admin/realtors", label: "Corretores", icon: UserRound },
  { href: "/admin/realtor-applications", label: "Aplicações", icon: FileText },
  { href: "/admin/reports", label: "Denúncias", icon: AlertTriangle },
  { href: "/admin/review-reports", label: "Avaliações", icon: Star },
  { href: "/admin/logs", label: "Logs", icon: Activity },
  { href: "/admin/settings", label: "Configurações", icon: Settings },
];

export const DEVELOPER_NAV_ITEMS: SidebarNavItem[] = [
  { href: "/developer", label: "Painel", icon: LayoutDashboard },
  { href: "/developer/projects", label: "Empreendimentos", icon: Home },
  { href: "/developer/profile", label: "Dados da empresa", icon: Settings },
];

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  const clean = pathname.split("?")[0] || "/";
  if (clean !== "/" && clean.endsWith("/")) return clean.slice(0, -1);
  return clean;
}

export function isOwnerNavItemActive(pathname: string, item: SidebarNavItem) {
  const p = normalizePath(pathname);
  const h = normalizePath(item.href);

  if (h === "/owner/dashboard") {
    return p === "/owner/dashboard";
  }

  if (h === "/owner/properties") {
    return p === "/owner" || p === "/owner/properties" || p.startsWith("/owner/properties/") || p.startsWith("/owner/edit/");
  }

  if (h === "/owner/leads") {
    return p === "/owner/leads" || p.startsWith("/owner/leads/");
  }

  if (h === "/owner/analytics") {
    return p === "/owner/analytics" || p.startsWith("/owner/analytics/");
  }

  if (h === "/owner/new") {
    return p === "/owner/new";
  }

  return p === h || p.startsWith(`${h}/`);
}

export function isAdminNavItemActive(pathname: string, item: SidebarNavItem) {
  const p = normalizePath(pathname);
  const h = normalizePath(item.href);

  if (h === "/admin") {
    return p === "/admin" || p === "/admin/dashboard";
  }

  if (h === "/admin/users") {
    return p === "/admin/users" || p.startsWith("/admin/users/");
  }

  if (h === "/admin/properties") {
    return p === "/admin/properties" || p.startsWith("/admin/properties/");
  }

  if (h === "/admin/analytics") {
    return p === "/admin/analytics" || p.startsWith("/admin/analytics/");
  }

  if (h === "/admin/leads") {
    return p === "/admin/leads" || p.startsWith("/admin/leads/");
  }

  if (h === "/admin/queue") {
    return p === "/admin/queue" || p.startsWith("/admin/queue/");
  }

  if (h === "/admin/queue-dashboard") {
    return p === "/admin/queue-dashboard" || p.startsWith("/admin/queue-dashboard/");
  }

  if (h === "/admin/realtors") {
    return p === "/admin/realtors" || p.startsWith("/admin/realtors/");
  }

  if (h === "/admin/realtor-applications") {
    return p === "/admin/realtor-applications" || p.startsWith("/admin/realtor-applications/");
  }

  if (h === "/admin/reports") {
    return p === "/admin/reports" || p.startsWith("/admin/reports/");
  }

  if (h === "/admin/review-reports") {
    return p === "/admin/review-reports" || p.startsWith("/admin/review-reports/");
  }

  if (h === "/admin/logs") {
    return p === "/admin/logs" || p.startsWith("/admin/logs/");
  }

  if (h === "/admin/settings") {
    return p === "/admin/settings" || p.startsWith("/admin/settings/");
  }

  return p === h || p.startsWith(`${h}/`);
}

export function isDeveloperNavItemActive(pathname: string, item: SidebarNavItem) {
  const p = normalizePath(pathname);
  const h = normalizePath(item.href);

  if (h === "/developer") {
    return p === "/developer";
  }

  if (h === "/developer/register") {
    return p === "/developer/register";
  }

  if (h === "/developer/profile") {
    return p === "/developer/profile";
  }

  return p === h || p.startsWith(`${h}/`);
}

export function getDashboardSidebarConfig(pathname: string | null | undefined): DashboardSidebarConfig | null {
  const p = normalizePath(pathname || "/");

  const isOwnerWorkspaceRoute =
    p === "/owner" ||
    p === "/owner/dashboard" ||
    p === "/owner/properties" ||
    p.startsWith("/owner/properties/") ||
    p === "/owner/leads" ||
    p.startsWith("/owner/leads/") ||
    p === "/owner/analytics" ||
    p.startsWith("/owner/analytics/") ||
    p === "/owner/new" ||
    p.startsWith("/owner/edit/");

  if (isOwnerWorkspaceRoute) {
    return {
      workspaceLabel: "Proprietário",
      storageKey: "oggahub_sidebar_collapsed_owner",
      items: OWNER_NAV_ITEMS,
      isItemActive: isOwnerNavItemActive,
    };
  }

  if (p === "/admin" || p.startsWith("/admin/")) {
    return {
      workspaceLabel: "Admin",
      storageKey: "oggahub_sidebar_collapsed_admin",
      items: ADMIN_NAV_ITEMS,
      isItemActive: isAdminNavItemActive,
    };
  }

  if (p === "/developer" || p.startsWith("/developer/")) {
    return {
      workspaceLabel: "Incorporadora",
      storageKey: "oggahub_sidebar_collapsed_developer",
      items: DEVELOPER_NAV_ITEMS,
      isItemActive: isDeveloperNavItemActive,
    };
  }

  return null;
}
