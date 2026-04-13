"use client";

import { useCallback, useEffect, useState } from "react";

export function useDesktopSidebarState(storageKey: string, defaultCollapsed = false) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "1" || stored === "0") {
        setCollapsed(stored === "1");
      }
    } catch {
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
    }
  }, [storageKey, collapsed, hydrated]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => !current);
  }, []);

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed,
    hydrated,
  };
}
