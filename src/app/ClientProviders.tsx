"use client";

import { SessionProvider } from "next-auth/react";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function ClientProviders({ children, session }: { children: React.ReactNode; session?: any }) {
  return (
    <ErrorBoundary>
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    </ErrorBoundary>
  );
}
