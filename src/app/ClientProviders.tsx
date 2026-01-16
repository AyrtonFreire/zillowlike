"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/modern";
import { ToastProvider } from "@/contexts/ToastContext";

function AuthRedirector() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();
  const prevStatusRef = useRef<typeof status>(status);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (prev === "authenticated" && status === "unauthenticated" && pathname !== "/") {
      router.replace("/");
    }
  }, [pathname, router, status]);

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
          <ToastProvider>
            <AuthRedirector />
            {children}
          </ToastProvider>
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
