"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/modern";
import { ToastProvider } from "@/contexts/ToastContext";
import { IssueDrawerProvider } from "@/contexts/IssueDrawerContext";

function PresenceHeartbeat() {
  const { data: session } = useSession();

  useEffect(() => {
    const role = (session as any)?.role || (session as any)?.user?.role;
    if (role !== "REALTOR" && role !== "ADMIN") return;

    let stopped = false;

    const ping = async () => {
      if (stopped) return;
      try {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        await fetch("/api/broker/heartbeat", { method: "POST" });
      } catch {
      }
    };

    void ping();

    const onFocus = () => void ping();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void ping();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(() => void ping(), 60_000);

    return () => {
      stopped = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [session]);

  return null;
}

export default function ClientProviders({ children, session }: { children: React.ReactNode; session?: any }) {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <SessionProvider 
          session={session}
          refetchInterval={600} // Refetch session every 60 seconds to get latest role
          refetchOnWindowFocus={false} // Refetch when user returns to tab
        >
          <PresenceHeartbeat />
          <ToastProvider>
            <IssueDrawerProvider>{children}</IssueDrawerProvider>
          </ToastProvider>
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
