"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ClipboardList, Minus, X } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import RealtorAssistantFeed from "@/components/crm/RealtorAssistantFeed";

export default function RealtorAssistantWidget() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const role = (session as any)?.user?.role || (session as any)?.role;
  const realtorId = (session as any)?.user?.id || (session as any)?.userId;

  const [open, setOpen] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const etagRef = useRef<string | null>(null);

  const isBrokerContext = !!pathname?.startsWith("/broker");
  const canRender =
    isBrokerContext &&
    !!realtorId &&
    (role === "REALTOR" || role === "AGENCY" || role === "ADMIN");

  const bottomOffsetClass = pathname?.startsWith("/broker/chats") ? "bottom-24" : "bottom-5";

  const leadIdFromPath = useMemo(() => {
    if (!pathname) return undefined;
    const m = pathname.match(/^\/broker\/leads\/([^/]+)$/);
    if (!m) return undefined;
    return m[1];
  }, [pathname]);

  const updateCount = useCallback(async () => {
    if (!canRender) return;
    try {
      const response = await fetch(
        "/api/assistant/count",
        etagRef.current ? { headers: { "if-none-match": etagRef.current } } : undefined
      );

      if (response.status === 304) return;

      const nextEtag = response.headers.get("etag");
      if (nextEtag) etagRef.current = nextEtag;

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || typeof data.activeCount !== "number") {
        setActiveCount(0);
        return;
      }
      setActiveCount(data.activeCount);
    } catch {
      setActiveCount(0);
    }
  }, [canRender]);

  useEffect(() => {
    if (!canRender) return;

    let cancelled = false;
    let interval: any;

    updateCount();
    interval = setInterval(() => updateCount(), 180000);

    try {
      const pusher = getPusherClient();
      const channelName = `private-realtor-${realtorId}`;
      const channel = pusher.subscribe(channelName);

      const handler = () => {
        if (cancelled) return;
        updateCount();
      };

      channel.bind("assistant-updated", handler as any);

      return () => {
        cancelled = true;
        clearInterval(interval);
        try {
          channel.unbind("assistant-updated", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
          // ignore
        }
      };
    } catch {
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
  }, [canRender, realtorId, updateCount]);

  useEffect(() => {
    if (!canRender) return;
    try {
      const key = "zlw_realtor_assistant_widget_open";
      const stored = window.localStorage.getItem(key);
      if (stored === "1") setOpen(true);
    } catch {
      // ignore
    }
  }, [canRender]);

  const setOpenPersisted = (value: boolean) => {
    setOpen(value);
    try {
      const key = "zlw_realtor_assistant_widget_open";
      window.localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!canRender) return;
    if (searchParams?.get("assistant") !== "1") return;

    setOpenPersisted(true);

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("assistant");
      const next = `${url.pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}${url.hash}`;
      window.history.replaceState(window.history.state, "", next);
    } catch {
      // ignore
    }
  }, [canRender, searchParams]);

  if (!canRender) return null;

  if (!open) {
    return (
      <>
        {/* Desktop launcher */}
        <button
          type="button"
          onClick={() => setOpenPersisted(true)}
          className="fixed top-28 right-4 z-[9999] hidden lg:flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-lg px-4 py-3 hover:shadow-xl transition-shadow"
        >
          <span className="relative">
            <ClipboardList className="w-5 h-5 text-gray-800" />
            {activeCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-white">
                {activeCount > 99 ? "99+" : activeCount}
              </span>
            )}
          </span>
          <span className="text-sm font-semibold text-gray-900">Assistente</span>
        </button>

        {/* Mobile launcher */}
        <button
          type="button"
          onClick={() => setOpenPersisted(true)}
          className={`fixed ${bottomOffsetClass} right-5 z-[9999] lg:hidden flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-lg px-4 py-3 hover:shadow-xl transition-shadow`}
        >
          <span className="relative">
            <ClipboardList className="w-5 h-5 text-gray-800" />
            {activeCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border border-white">
                {activeCount > 99 ? "99+" : activeCount}
              </span>
            )}
          </span>
          <span className="text-sm font-semibold text-gray-900">Assistente</span>
        </button>
      </>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed top-0 right-0 z-[9999] hidden lg:flex h-screen w-[400px] bg-white border-l border-gray-200 shadow-2xl">
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-gray-800" />
              <div className="text-sm font-semibold text-gray-900">Assistente do Corretor</div>
              {activeCount > 0 && (
                <div className="ml-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  {activeCount}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpenPersisted(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title="Minimizar"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpenPersisted(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-3">
              <RealtorAssistantFeed
                realtorId={realtorId}
                leadId={leadIdFromPath}
                embedded
                onDidMutate={() => {
                  etagRef.current = null;
                  updateCount();
                }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom sheet */}
      <div className="fixed inset-0 z-[9999] lg:hidden">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setOpenPersisted(false)}
        />
        <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-gray-800" />
              <div className="text-sm font-semibold text-gray-900">Assistente do Corretor</div>
              {activeCount > 0 && (
                <div className="ml-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  {activeCount}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpenPersisted(false)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="p-3">
              <RealtorAssistantFeed
                realtorId={realtorId}
                leadId={leadIdFromPath}
                embedded
                onDidMutate={() => {
                  etagRef.current = null;
                  updateCount();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
