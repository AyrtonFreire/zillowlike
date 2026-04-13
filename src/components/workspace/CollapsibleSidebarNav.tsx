"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useDesktopSidebarState } from "./useDesktopSidebarState";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type BadgeRenderOptions = {
  collapsed: boolean;
  active: boolean;
};

type CollapsibleSidebarNavProps<T extends SidebarNavItem = SidebarNavItem> = {
  items: T[];
  pathname: string;
  storageKey: string;
  workspaceLabel: string;
  isItemActive: (pathname: string, item: T) => boolean;
  renderBadge?: (item: T, options: BadgeRenderOptions) => ReactNode;
};

export default function CollapsibleSidebarNav<T extends SidebarNavItem = SidebarNavItem>({
  items,
  pathname,
  storageKey,
  workspaceLabel,
  isItemActive,
  renderBadge,
}: CollapsibleSidebarNavProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const { collapsed, toggleCollapsed } = useDesktopSidebarState(storageKey, false);
  const containerMotionClass = prefersReducedMotion ? "transition-none" : "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const itemMotionClass = prefersReducedMotion
    ? "transition-none"
    : "transition-[background-color,color,box-shadow,transform,padding,margin,opacity,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const labelMotionClass = prefersReducedMotion
    ? "transition-none"
    : "transition-[opacity,transform,width,margin] duration-200 ease-out";

  return (
    <aside
      className={`md:flex-shrink-0 md:w-[var(--sidebar-width)] ${containerMotionClass} md:sticky md:top-24 md:self-start`}
      style={{ ["--sidebar-width" as string]: collapsed ? "5.5rem" : "16rem" }}
    >
      <nav className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white/70 p-2 shadow-sm backdrop-blur md:p-3">
        <div className="mb-2 hidden items-center justify-between gap-2 md:flex">
          <span
            className={`overflow-hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 ${labelMotionClass} ${
              collapsed ? "w-0 -translate-x-1 opacity-0" : "w-auto translate-x-0 opacity-100"
            }`}
          >
            {workspaceLabel}
          </span>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-expanded={!collapsed}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-1">
          {items.map((item) => {
            const active = isItemActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2.5 text-xs font-semibold md:flex-row md:justify-start md:text-sm ${itemMotionClass} ${
                  active
                    ? "glass-teal border-transparent text-white shadow-md"
                    : "border-transparent bg-white/60 text-gray-700 hover:bg-white hover:shadow-sm"
                } ${collapsed ? "md:justify-center md:px-2.5" : "md:justify-start md:px-3"}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-gray-600"}`} />
                <span
                  className={`leading-none whitespace-nowrap ${labelMotionClass} ${
                    collapsed
                      ? "md:pointer-events-none md:-translate-x-1 md:overflow-hidden md:opacity-0 md:w-0"
                      : "md:translate-x-0 md:opacity-100 md:w-auto"
                  }`}
                >
                  {item.label}
                </span>
                {renderBadge ? renderBadge(item, { collapsed, active }) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
