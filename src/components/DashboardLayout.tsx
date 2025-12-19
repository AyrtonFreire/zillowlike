"use client";

import { ModernNavbar } from "./modern";
import Link from "next/link";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import RealtorAssistantWidget from "@/components/crm/RealtorAssistantWidget";
import { usePathname } from "next/navigation";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
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
      <main className={isBrokerContext ? "lg:pr-[420px]" : undefined}>{children}</main>

      <RealtorAssistantWidget />
    </div>
  );
}
