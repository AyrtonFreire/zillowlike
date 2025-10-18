"use client";

import { SessionProvider } from "next-auth/react";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function ClientProviders({ children, session }: { children: React.ReactNode; session?: any }) {
  return (
    <ErrorBoundary>
      <SessionProvider 
        session={session}
        refetchInterval={60} // Refetch session every 60 seconds to get latest role
        refetchOnWindowFocus={true} // Refetch when user returns to tab
      >
        {children}
      </SessionProvider>
    </ErrorBoundary>
  );
}
