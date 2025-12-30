"use client";

import { SessionProvider } from "next-auth/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/modern";
import { ToastProvider } from "@/contexts/ToastContext";

export default function ClientProviders({ children, session }: { children: React.ReactNode; session?: any }) {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <SessionProvider 
          session={session}
          refetchInterval={600} // Refetch session every 60 seconds to get latest role
          refetchOnWindowFocus={false} // Refetch when user returns to tab
        >
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
