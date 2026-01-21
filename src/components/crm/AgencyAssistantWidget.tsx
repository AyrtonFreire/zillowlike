"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, Minus, X } from "lucide-react";
import { AgencyAssistantFeed } from "@/components/crm/AgencyAssistantFeed";

type AgencyProfile = {
  teamId: string;
};

export function AgencyAssistantWidget() {
  const [mounted, setMounted] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [launcherPosition, setLauncherPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingLauncher, setIsDraggingLauncher] = useState(false);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef({ offsetX: 0, offsetY: 0, dragging: false, dragged: false });

  const countEtagRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/agency/profile`);
        const data = await response.json();
        if (!response.ok || !data?.success || !data?.agencyProfile?.teamId) {
          return;
        }
        const profile: AgencyProfile = { teamId: String(data.agencyProfile.teamId) };
        if (cancelled) return;
        setTeamId(profile.teamId);
      } catch {
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchCount = useCallback(async () => {
    try {
      const headers: any = {};
      if (countEtagRef.current) headers["if-none-match"] = countEtagRef.current;

      const response = await fetch(`/api/assistant/count?context=AGENCY`, { headers });
      if (response.status === 304) return;

      const data = await response.json();
      if (!response.ok || !data?.success) return;

      const nextEtag = response.headers.get("etag");
      countEtagRef.current = nextEtag || null;

      const nextCount = Number(data.activeCount || 0);
      if (!Number.isFinite(nextCount)) return;
      setActiveCount(nextCount);
    } catch {
    }
  }, []);

  useEffect(() => {
    void fetchCount();
    const t = window.setInterval(() => fetchCount(), 30000);
    return () => window.clearInterval(t);
  }, [fetchCount]);

  useEffect(() => {
    const onForce = () => fetchCount();
    window.addEventListener("zlw-assistant-force-refresh", onForce as any);
    return () => window.removeEventListener("zlw-assistant-force-refresh", onForce as any);
  }, [fetchCount]);

  const canRender = useMemo(() => {
    return mounted && typeof document !== "undefined";
  }, [mounted]);

  const bottomOffsetPx = 20;
  const mobileSafeAreaStyle = useMemo(() => {
    return {
      bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottomOffsetPx}px)`,
      right: "20px",
    } as React.CSSProperties;
  }, [bottomOffsetPx]);

  const launcherStyle = launcherPosition
    ? { left: `${launcherPosition.x}px`, top: `${launcherPosition.y}px` }
    : mobileSafeAreaStyle;

  if (!canRender) return null;
  if (!teamId) return null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!launcherRef.current) return;
    if (launcherPosition) return;

    const button = launcherRef.current;
    const width = button.offsetWidth || 180;
    const height = button.offsetHeight || 48;
    const margin = 20;
    const nextX = Math.max(margin, window.innerWidth - width - margin);
    const nextY = Math.max(margin, window.innerHeight - height - bottomOffsetPx);
    setLauncherPosition({ x: nextX, y: nextY });
  }, [launcherPosition, bottomOffsetPx]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onMove = (event: PointerEvent) => {
      if (!dragStateRef.current.dragging) return;
      const button = launcherRef.current;
      if (!button) return;

      const width = button.offsetWidth || 180;
      const height = button.offsetHeight || 48;
      const margin = 12;
      const maxX = Math.max(margin, window.innerWidth - width - margin);
      const maxY = Math.max(margin, window.innerHeight - height - margin);
      const nextX = Math.min(Math.max(event.clientX - dragStateRef.current.offsetX, margin), maxX);
      const nextY = Math.min(Math.max(event.clientY - dragStateRef.current.offsetY, margin), maxY);

      if (!dragStateRef.current.dragged && launcherPosition) {
        const dx = Math.abs(nextX - launcherPosition.x);
        const dy = Math.abs(nextY - launcherPosition.y);
        if (dx > 3 || dy > 3) dragStateRef.current.dragged = true;
      }

      setLauncherPosition({ x: nextX, y: nextY });
    };

    const onUp = () => {
      if (!dragStateRef.current.dragging) return;
      dragStateRef.current.dragging = false;
      setIsDraggingLauncher(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [launcherPosition]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!launcherPosition) return;

    const onResize = () => {
      const button = launcherRef.current;
      if (!button) return;
      const width = button.offsetWidth || 180;
      const height = button.offsetHeight || 48;
      const margin = 12;
      const maxX = Math.max(margin, window.innerWidth - width - margin);
      const maxY = Math.max(margin, window.innerHeight - height - margin);

      setLauncherPosition((prev) => {
        if (!prev) return prev;
        const nextX = Math.min(Math.max(prev.x, margin), maxX);
        const nextY = Math.min(Math.max(prev.y, margin), maxY);
        if (nextX === prev.x && nextY === prev.y) return prev;
        return { x: nextX, y: nextY };
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [launcherPosition]);

  const widgetUi = !open ? (
    <>
      <button
        type="button"
        ref={launcherRef}
        style={launcherStyle}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragStateRef.current.dragging = true;
          dragStateRef.current.dragged = false;
          const rect = event.currentTarget.getBoundingClientRect();
          dragStateRef.current.offsetX = event.clientX - rect.left;
          dragStateRef.current.offsetY = event.clientY - rect.top;
          setIsDraggingLauncher(true);
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
          }
        }}
        onClick={() => {
          if (dragStateRef.current.dragged || isDraggingLauncher) return;
          setOpen(true);
        }}
        className="fixed z-[2147483647] flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-lg px-4 py-3 hover:shadow-xl transition-shadow touch-none select-none"
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
  ) : (
    <>
      <aside className="fixed top-0 right-0 z-[2147483647] hidden lg:flex h-screen w-[420px] bg-white border-l border-gray-200 shadow-2xl">
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-gray-800" />
              <div className="text-sm font-semibold text-gray-900">Assistente da Agência</div>
              {activeCount > 0 && (
                <div className="ml-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  {activeCount} pendência{activeCount > 1 ? "s" : ""}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title="Minimizar"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-3">
              <AgencyAssistantFeed
                teamId={teamId}
                embedded
                onDidMutate={() => {
                  try {
                    window.dispatchEvent(new Event("zlw-assistant-force-refresh"));
                  } catch {
                  }
                  try {
                    fetchCount();
                    window.setTimeout(() => fetchCount(), 800);
                  } catch {
                  }
                }}
              />
            </div>
          </div>
        </div>
      </aside>

      <div className="fixed inset-0 z-[2147483647] lg:hidden">
        <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
        <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-gray-800" />
              <div className="text-sm font-semibold text-gray-900">Assistente da Agência</div>
              {activeCount > 0 && (
                <div className="ml-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  {activeCount} pendência{activeCount > 1 ? "s" : ""}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="p-3">
              <AgencyAssistantFeed
                teamId={teamId}
                embedded
                onDidMutate={() => {
                  try {
                    window.dispatchEvent(new Event("zlw-assistant-force-refresh"));
                  } catch {
                  }
                  try {
                    fetchCount();
                    window.setTimeout(() => fetchCount(), 800);
                  } catch {
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(widgetUi, document.body);
}
