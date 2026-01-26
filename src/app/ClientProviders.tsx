"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/modern";
import { ToastProvider } from "@/contexts/ToastContext";
import { IssueDrawerProvider } from "@/contexts/IssueDrawerContext";

function PresenceHeartbeat() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const lastPingRef = useRef(0);

  useEffect(() => {
    const role = (session as any)?.role || (session as any)?.user?.role;
    if (role !== "REALTOR" && role !== "ADMIN") return;

    const path = String(pathname || "");
    const isInternalArea = path.startsWith("/broker") || path.startsWith("/admin");
    if (!isInternalArea) return;

    let stopped = false;

    const ping = async () => {
      if (stopped) return;
      try {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

        const now = Date.now();
        const minIntervalMs = 5 * 60_000;
        if (now - lastPingRef.current < minIntervalMs) return;
        lastPingRef.current = now;

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
    const interval = window.setInterval(() => void ping(), 5 * 60_000);

    return () => {
      stopped = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [session, pathname]);

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
