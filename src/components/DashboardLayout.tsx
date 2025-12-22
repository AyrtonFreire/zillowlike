"use client";

import { ModernNavbar } from "./modern";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import RealtorAssistantWidget from "@/components/crm/RealtorAssistantWidget";
import { usePathname } from "next/navigation";

interface DashboardLayoutProps {
  children: ReactNode;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function DashboardLayout({
  children,
  title,
  description,
  actions,
  breadcrumbs,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const isBrokerContext = !!pathname?.startsWith("/broker");
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    if (!isBrokerContext) return;

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
  }, [isBrokerContext]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <ModernNavbar />

      {/* Modern Context Bar with same brand gradient as header */}
      <div className="bg-brand-gradient shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              {/* Breadcrumbs */}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex mb-3" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <svg
                            className="w-4 h-4 mx-2 text-white/60"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        )}
                        {crumb.href ? (
                          <Link
                            href={crumb.href}
                            className="text-white/80 hover:text-white transition-colors font-medium"
                          >
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className="text-white font-semibold">
                            {crumb.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Title and Description */}
              <div>
                <h1 className="text-3xl font-bold text-white truncate">
                  {title}
                </h1>
                {description && (
                  <p className="text-white/90 mt-2">{description}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            {actions && (
              <div className="ml-4 flex-shrink-0 flex items-center gap-3">
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <main
        className={`transition-[padding] duration-300 ease-in-out ${
          isBrokerContext && assistantOpen ? "lg:pr-[420px]" : ""
        }`}
      >
        {children}
      </main>

      <RealtorAssistantWidget />
    </div>
  );
}
