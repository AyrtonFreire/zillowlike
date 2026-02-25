"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMaps";

type Item = {
  id: string;
  price: number;
  latitude: number;
  longitude: number;
  title?: string;
};

type MapProps = {
  items: Item[];
  isLoading?: boolean;
  onBoundsChange?: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
  autoFitOnItemsChange?: boolean;
  onHoverChange?: (id: string | null) => void;
  autoLoad?: boolean;
};

function isFiniteNumber(n: any): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function formatPriceBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function GoogleMapWithPriceBubbles({
  items,
  isLoading,
  onBoundsChange,
  autoFitOnItemsChange = false,
  onHoverChange,
  autoLoad = true,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const idleListenerRef = useRef<any>(null);
  const debounceRef = useRef<any>(null);
  const userMovedRef = useRef(false);
  const userMoveListenersRef = useRef<any[]>([]);
  const renderRef = useRef<(() => void) | null>(null);

  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const center = useMemo(() => {
    if (Array.isArray(items) && items.length > 0) {
      const first = items.find((p) => isFiniteNumber(p.latitude) && isFiniteNumber(p.longitude));
      if (first) return [first.latitude, first.longitude] as [number, number];
    }
    return [-9.4048, -40.5058] as [number, number];
  }, [items]);

  // Activate when visible
  useEffect(() => {
    if (activated) return;
    if (!autoLoad) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setActivated(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActivated(true);
          obs.disconnect();
        }
      },
      { root: null, threshold: 0.15, rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [activated, autoLoad]);

  // Load script
  useEffect(() => {
    if (!activated || isLoading) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(String(e?.message || e));
      });
    return () => {
      cancelled = true;
    };
  }, [activated, isLoading]);

  // Init map
  useEffect(() => {
    if (!ready || isLoading) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const google = (window as any).google;
    const mapId = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "").trim() || undefined;

    const map = new google.maps.Map(containerRef.current, {
      center: { lat: center[0], lng: center[1] },
      zoom: 13,
      mapId,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      keyboardShortcuts: false,
      gestureHandling: "greedy",
    });

    mapRef.current = map;

    // Mark that the user moved the map (avoid onBoundsChange on initial idle)
    const onUserMoved = () => {
      userMovedRef.current = true;
    };
    try {
      userMoveListenersRef.current = [
        map.addListener("dragstart", onUserMoved),
        map.addListener("zoom_changed", onUserMoved),
      ];
    } catch {
      userMoveListenersRef.current = [];
    }

    return () => {
      try {
        if (idleListenerRef.current) idleListenerRef.current.remove();
      } catch {}
      try {
        for (const l of userMoveListenersRef.current) l?.remove?.();
      } catch {}
      userMoveListenersRef.current = [];
      idleListenerRef.current = null;
      mapRef.current = null;
    };
  }, [ready, isLoading, center]);

  // Highlight state from events
  const highlightedIdRef = useRef<string | null>(null);
  useEffect(() => {
    const handleHighlight = (e: Event) => {
      const ce = e as CustomEvent;
      highlightedIdRef.current = ce.detail?.id || null;
      try {
        renderRef.current?.();
      } catch {}
    };
    const handleUnhighlight = () => {
      highlightedIdRef.current = null;
      try {
        renderRef.current?.();
      } catch {}
      onHoverChange?.(null);
    };

    window.addEventListener("map-highlight-marker", handleHighlight as EventListener);
    window.addEventListener("map-unhighlight-marker", handleUnhighlight as EventListener);
    return () => {
      window.removeEventListener("map-highlight-marker", handleHighlight as EventListener);
      window.removeEventListener("map-unhighlight-marker", handleUnhighlight as EventListener);
    };
  }, [onHoverChange]);

  // Auto-fit on items change (optional)
  const prevFirstIdRef = useRef<string | undefined>(undefined);
  const hasAutoFittedRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !autoFitOnItemsChange) return;
    if (!items || items.length === 0) return;

    const currentFirstId = items[0]?.id;
    const significantChange = currentFirstId !== prevFirstIdRef.current && currentFirstId !== undefined;

    if (!hasAutoFittedRef.current || significantChange) {
      fitToItems(map, items);
      hasAutoFittedRef.current = true;
    }

    prevFirstIdRef.current = currentFirstId;
  }, [items, autoFitOnItemsChange]);

  // Render overlays on idle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isLoading) return;

    const google = (window as any).google;

    const clearOverlays = () => {
      for (const ov of overlaysRef.current) {
        try {
          ov.setMap(null);
        } catch {}
      }
      overlaysRef.current = [];
    };

    const createOverlay = (position: { lat: number; lng: number }, el: HTMLElement) => {
      class HtmlOverlay extends google.maps.OverlayView {
        onAdd() {
          const panes = this.getPanes();
          const target = panes?.overlayMouseTarget || panes?.overlayLayer;
          if (target) target.appendChild(el);
        }
        draw() {
          const proj = this.getProjection();
          if (!proj) return;
          const pt = proj.fromLatLngToDivPixel(new google.maps.LatLng(position.lat, position.lng));
          if (!pt) return;
          el.style.left = `${pt.x}px`;
          el.style.top = `${pt.y}px`;
        }
        onRemove() {
          try {
            el.remove();
          } catch {}
        }
      }
      const ov = new HtmlOverlay();
      ov.setMap(map);
      return ov;
    };

    const buildPriceEl = (item: Item, highlighted: boolean) => {
      const formattedPrice = formatPriceBRL(item.price);

      const size = 0; // unused; HTML marker
      void size;

      const outer = document.createElement("div");
      outer.style.position = "absolute";
      outer.style.transform = "translate(-50%,-100%)";
      outer.style.paddingBottom = "8px";
      outer.style.cursor = "pointer";
      outer.style.userSelect = "none";
      outer.style.zIndex = highlighted ? "1000" : "100";

      const bubble = document.createElement("div");
      bubble.style.position = "relative";
      bubble.style.display = "inline-flex";
      bubble.style.alignItems = "center";
      bubble.style.justifyContent = "center";
      bubble.style.background = highlighted ? "#2563eb" : "#ffffff";
      bubble.style.color = highlighted ? "#ffffff" : "#1f2937";
      bubble.style.padding = "8px 14px";
      bubble.style.borderRadius = "24px";
      bubble.style.fontWeight = "700";
      bubble.style.fontSize = "13px";
      bubble.style.boxShadow = highlighted
        ? "0 8px 24px rgba(37, 99, 235, 0.4), 0 0 0 3px rgba(37, 99, 235, 0.2)"
        : "0 4px 12px rgba(0, 0, 0, 0.15)";
      bubble.style.border = highlighted ? "2px solid #1d4ed8" : "2px solid #e5e7eb";
      bubble.style.whiteSpace = "nowrap";
      bubble.style.transform = highlighted ? "scale(1.15)" : "scale(1)";
      bubble.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";

      const t = document.createElement("span");
      t.textContent = formattedPrice;
      bubble.appendChild(t);

      const arrow = document.createElement("div");
      arrow.style.position = "absolute";
      arrow.style.left = "50%";
      arrow.style.transform = "translateX(-50%)";
      arrow.style.bottom = "-6px";
      arrow.style.width = "0";
      arrow.style.height = "0";
      arrow.style.borderLeft = "6px solid transparent";
      arrow.style.borderRight = "6px solid transparent";
      arrow.style.borderTop = `6px solid ${highlighted ? "#2563eb" : "#ffffff"}`;
      bubble.appendChild(arrow);

      outer.appendChild(bubble);

      outer.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          window.dispatchEvent(new CustomEvent("open-overlay", { detail: { id: item.id } }));
        } catch {}
      });
      outer.addEventListener("mouseenter", () => {
        onHoverChange?.(item.id);
      });
      outer.addEventListener("mouseleave", () => {
        onHoverChange?.(null);
      });

      return outer;
    };

    const buildClusterEl = (count: number, isHighlighted: boolean, center: { lat: number; lng: number }) => {
      const size = count > 50 ? 64 : count > 20 ? 56 : count > 10 ? 52 : 48;
      const fontSize = count > 50 ? 20 : count > 20 ? 18 : count > 10 ? 17 : 16;

      const outer = document.createElement("div");
      outer.style.position = "absolute";
      outer.style.transform = "translate(-50%,-50%)";
      outer.style.cursor = "pointer";
      outer.style.userSelect = "none";
      outer.style.zIndex = isHighlighted ? "1000" : "500";

      const chip = document.createElement("div");
      chip.style.position = "relative";
      chip.style.display = "inline-flex";
      chip.style.alignItems = "center";
      chip.style.justifyContent = "center";
      chip.style.width = `${size}px`;
      chip.style.height = `${size}px`;
      chip.style.borderRadius = "50%";
      chip.style.fontWeight = "800";
      chip.style.fontSize = `${fontSize}px`;
      chip.style.color = "#ffffff";
      chip.style.background = `linear-gradient(135deg, ${isHighlighted ? "#3b82f6" : "#1d4ed8"} 0%, ${isHighlighted ? "#1d4ed8" : "#1e40af"} 100%)`;
      chip.style.boxShadow = isHighlighted
        ? "0 12px 32px rgba(37, 99, 235, 0.6), 0 0 0 5px rgba(37, 99, 235, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.2)"
        : "0 8px 24px rgba(29, 78, 216, 0.5), 0 0 0 3px rgba(255, 255, 255, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.2)";
      chip.style.transform = isHighlighted ? "scale(1.2)" : "scale(1)";
      chip.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

      const span = document.createElement("span");
      span.textContent = String(count);
      chip.appendChild(span);

      outer.appendChild(chip);

      outer.addEventListener("click", (e) => {
        e.preventDefault();
        const z = map.getZoom() || 13;
        map.setZoom(Math.min(z + 2, 18));
        map.panTo(center);
      });

      return outer;
    };

    const clusterByGrid = (zoom: number) => {
      const validItems = (items || []).filter(
        (item) => isFiniteNumber(item.latitude) && isFiniteNumber(item.longitude) && item.latitude !== 0 && item.longitude !== 0
      );

      let gridSize = 0.01;
      let forceCluster = false;
      if (zoom >= 15) {
        gridSize = 0.0001;
        forceCluster = false;
      } else if (zoom >= 13) {
        gridSize = 0.002;
        forceCluster = false;
      } else if (zoom >= 11) {
        gridSize = 0.01;
        forceCluster = true;
      } else if (zoom >= 9) {
        gridSize = 0.03;
        forceCluster = true;
      } else {
        gridSize = 0.08;
        forceCluster = true;
      }

      const clusterMap = new Map<string, Item[]>();
      validItems.forEach((item) => {
        const gridLat = Math.floor(item.latitude / gridSize) * gridSize;
        const gridLng = Math.floor(item.longitude / gridSize) * gridSize;
        const key = `${gridLat.toFixed(6)},${gridLng.toFixed(6)}`;
        const existing = clusterMap.get(key) || [];
        existing.push(item);
        clusterMap.set(key, existing);
      });

      return Array.from(clusterMap.values()).map((group) => {
        const avgLat = group.reduce((sum, item) => sum + item.latitude, 0) / group.length;
        const avgLng = group.reduce((sum, item) => sum + item.longitude, 0) / group.length;
        return { items: group, lat: avgLat, lng: avgLng, isCluster: forceCluster || group.length >= 2 };
      });
    };

    const render = () => {
      clearOverlays();
      const zoom = map.getZoom?.();
      if (!isFiniteNumber(zoom)) return;
      const clusters = clusterByGrid(zoom);
      const highlightedId = highlightedIdRef.current;

      for (const c of clusters) {
        if (c.isCluster) {
          const isHighlighted = c.items.some((it) => it.id === highlightedId);
          const el = buildClusterEl(c.items.length, isHighlighted, { lat: c.lat, lng: c.lng });
          overlaysRef.current.push(createOverlay({ lat: c.lat, lng: c.lng }, el));
        } else {
          const item = c.items[0];
          const el = buildPriceEl(item, item.id === highlightedId);
          overlaysRef.current.push(createOverlay({ lat: item.latitude, lng: item.longitude }, el));
        }
      }

      // bounds change (debounced)
      if (onBoundsChange) {
        if (!userMovedRef.current) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          try {
            const b = map.getBounds?.();
            if (!b) return;
            onBoundsChange({
              minLat: b.getSouthWest().lat(),
              maxLat: b.getNorthEast().lat(),
              minLng: b.getSouthWest().lng(),
              maxLng: b.getNorthEast().lng(),
            });
          } catch {}
        }, 500);
      }
    };

    renderRef.current = render;

    // Always reattach to avoid stale closures when items/onBoundsChange change
    try {
      if (idleListenerRef.current) idleListenerRef.current.remove();
    } catch {}
    idleListenerRef.current = null;

    idleListenerRef.current = map.addListener("idle", () => {
      try {
        renderRef.current?.();
      } catch {}
    });

    render();

    return () => {
      try {
        if (idleListenerRef.current) idleListenerRef.current.remove();
      } catch {}
      idleListenerRef.current = null;
      renderRef.current = null;
    };
  }, [items, isLoading, onBoundsChange, onHoverChange]);

  const showPlaceholder = isLoading || !activated || !ready;

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {showPlaceholder ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
          onClick={() => setActivated(true)}
          role="button"
          tabIndex={0}
        >
          <div className="text-center px-6">
            <div className="text-sm font-medium text-gray-700">Carregar mapa</div>
            <div className="text-xs text-gray-500 mt-1">O mapa carrega apenas quando necessário para reduzir custos.</div>
          </div>
        </div>
      ) : null}

      <div ref={containerRef} className="absolute inset-0" />

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/95">
          <div className="max-w-md px-6 text-center">
            <div className="text-sm font-semibold text-gray-900">Não foi possível carregar o mapa</div>
            <div className="text-xs text-gray-600 mt-1">{loadError}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function fitToItems(map: any, items: Item[]) {
  const google = (window as any).google;
  const pts = (items || []).filter(
    (p) => typeof p?.latitude === "number" && typeof p?.longitude === "number" && p.latitude !== 0 && p.longitude !== 0
  );
  if (pts.length === 0) return;

  if (pts.length === 1) {
    map.setCenter({ lat: pts[0].latitude, lng: pts[0].longitude });
    map.setZoom(Math.max(map.getZoom?.() || 13, 13));
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  pts.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
  map.fitBounds(bounds, 50);
}
