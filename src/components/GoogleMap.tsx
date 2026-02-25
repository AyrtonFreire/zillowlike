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

type Poi = { lat: number; lng: number; label: string; emoji?: string };

type PoisProp =
  | { mode: "list"; items: Poi[] }
  | { mode: "auto"; center: [number, number]; radius?: number };

type Props = {
  items: Item[];
  centerZoom?: { center: [number, number]; zoom: number };
  onViewChange?: (v: {
    center: [number, number];
    zoom: number;
    bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  }) => void;
  highlightId?: string;
  onHoverChange?: (id: string | null) => void;
  autoFit?: boolean;
  hideRefitButton?: boolean;
  isLoading?: boolean;
  pois?: PoisProp;
  simplePin?: boolean;
  centeredPriceMarkers?: boolean;
  limitInteraction?: { minZoom: number; maxZoom: number; radiusMeters: number };
  autoLoad?: boolean;
};

function metersToBounds(center: [number, number], radiusMeters: number) {
  const [lat, lng] = center;
  const dLat = radiusMeters / 111111;
  const dLng = radiusMeters / (111111 * Math.cos((lat * Math.PI) / 180));
  return {
    south: lat - dLat,
    west: lng - dLng,
    north: lat + dLat,
    east: lng + dLng,
  };
}

function isFiniteNumber(n: any): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function formatPriceBRL(cents: number) {
  return `R$ ${(cents / 100).toLocaleString("pt-BR")}`;
}

function clusterByGrid(items: Item[], zoom: number) {
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
    const avgLat = group.reduce((sum, it) => sum + it.latitude, 0) / group.length;
    const avgLng = group.reduce((sum, it) => sum + it.longitude, 0) / group.length;
    return {
      items: group,
      lat: avgLat,
      lng: avgLng,
      isCluster: forceCluster || group.length >= 2,
    };
  });
}

export default function GoogleMap(props: Props) {
  const {
    items,
    centerZoom,
    onViewChange,
    highlightId,
    onHoverChange,
    autoFit,
    hideRefitButton,
    isLoading,
    pois,
    simplePin,
    centeredPriceMarkers,
    limitInteraction,
    autoLoad = true,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const poiOverlaysRef = useRef<any[]>([]);
  const poiListRef = useRef<Poi[]>([]);
  const poiKeyRef = useRef<string>("");
  const poiFetchRef = useRef<Promise<Poi[]> | null>(null);
  const infoWindowRef = useRef<any>(null);
  const idleListenerRef = useRef<any>(null);
  const redrawRef = useRef<(() => void) | null>(null);
  const hasFitOnceRef = useRef(false);
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const defaultCenter = useMemo(() => {
    if (Array.isArray(items) && items.length > 0) {
      const first = items.find((p) => isFiniteNumber(p.latitude) && isFiniteNumber(p.longitude));
      if (first) return [first.latitude, first.longitude] as [number, number];
    }
    return [-9.4048, -40.5058] as [number, number];
  }, [items]);

  // Activate (lazy-load) when in view
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

  // Load Google Maps script once activated
  useEffect(() => {
    if (!activated) return;
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
  }, [activated]);

  // Initialize map once
  useEffect(() => {
    if (!ready) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const google = (window as any).google;
    const mapId = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "").trim() || undefined;

    const initialCenter = centerZoom?.center ?? defaultCenter;
    const initialZoom = centerZoom?.zoom ?? 13;

    const options: any = {
      center: { lat: initialCenter[0], lng: initialCenter[1] },
      zoom: initialZoom,
      mapId,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      keyboardShortcuts: false,
    };

    if (limitInteraction) {
      const bounds = metersToBounds(initialCenter, limitInteraction.radiusMeters);
      options.minZoom = limitInteraction.minZoom;
      options.maxZoom = limitInteraction.maxZoom;
      options.restriction = {
        latLngBounds: bounds,
        strictBounds: true,
      };
      options.scrollwheel = false;
      options.disableDoubleClickZoom = true;
      options.gestureHandling = "greedy";
    }

    const map = new google.maps.Map(containerRef.current, options);
    mapRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();

    // Refit event
    const onRefit = () => {
      if (!mapRef.current) return;
      fitToItems(mapRef.current, items);
    };
    window.addEventListener("map-refit", onRefit as EventListener);

    // Center event
    const onCenterTo = (e: any) => {
      const { lat, lng, zoom } = (e as CustomEvent)?.detail || {};
      if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return;
      const z = isFiniteNumber(zoom) ? zoom : map.getZoom();
      map.setZoom(z);
      map.panTo({ lat, lng });
    };
    window.addEventListener("map-center-to", onCenterTo as EventListener);

    return () => {
      window.removeEventListener("map-refit", onRefit as EventListener);
      window.removeEventListener("map-center-to", onCenterTo as EventListener);
      try {
        if (idleListenerRef.current) idleListenerRef.current.remove();
      } catch {}
      idleListenerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Keep map center/zoom in sync if centerZoom is provided
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !centerZoom) return;
    const [lat, lng] = centerZoom.center;
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return;
    map.setZoom(centerZoom.zoom);
    map.panTo({ lat, lng });
  }, [centerZoom]);

  // Update interaction restriction when limitInteraction changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!limitInteraction) return;

    const center = centerZoom?.center ?? defaultCenter;
    const bounds = metersToBounds(center, limitInteraction.radiusMeters);
    map.setOptions({
      minZoom: limitInteraction.minZoom,
      maxZoom: limitInteraction.maxZoom,
      restriction: { latLngBounds: bounds, strictBounds: true },
      scrollwheel: false,
      disableDoubleClickZoom: true,
      gestureHandling: "greedy",
    });
  }, [limitInteraction, centerZoom, defaultCenter]);

  // Listen to highlight events
  const highlightedRef = useRef<string | null>(null);
  useEffect(() => {
    highlightedRef.current = highlightId ?? null;
    try {
      redrawRef.current?.();
    } catch {}
  }, [highlightId]);

  // Render items & POIs on map idle (react to pan/zoom)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const google = (window as any).google;

    const clearOverlays = (arr: any[]) => {
      for (const ov of arr) {
        try {
          ov.setMap(null);
        } catch {}
      }
      arr.length = 0;
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

    const buildPriceBubbleEl = (item: Item, highlighted: boolean) => {
      const bg = highlighted ? "#0ea5e9" : "#1d4ed8";
      const label = formatPriceBRL(item.price);

      const outer = document.createElement("div");
      outer.style.position = "absolute";
      outer.style.transform = centeredPriceMarkers ? "translate(-50%,-100%)" : "translate(-50%,-100%)";
      outer.style.cursor = "pointer";
      outer.style.userSelect = "none";
      outer.style.zIndex = highlighted ? "1400" : "1200";

      const bubble = document.createElement("div");
      bubble.style.position = "relative";
      bubble.style.display = "inline-block";
      bubble.style.background = bg;
      bubble.style.color = "#ffffff";
      bubble.style.padding = "5px 9px";
      bubble.style.borderRadius = "12px";
      bubble.style.fontWeight = "800";
      bubble.style.fontSize = "11px";
      bubble.style.letterSpacing = ".1px";
      bubble.style.boxShadow = "0 8px 24px rgba(0,0,0,.25)";
      bubble.style.whiteSpace = "nowrap";

      const text = document.createElement("span");
      text.textContent = label;
      bubble.appendChild(text);

      const arrow = document.createElement("div");
      arrow.style.position = "absolute";
      arrow.style.left = "50%";
      arrow.style.transform = "translateX(-50%)";
      arrow.style.bottom = "-8px";
      arrow.style.width = "0";
      arrow.style.height = "0";
      arrow.style.borderLeft = "8px solid transparent";
      arrow.style.borderRight = "8px solid transparent";
      arrow.style.borderTop = `8px solid ${bg}`;
      bubble.appendChild(arrow);

      outer.appendChild(bubble);

      outer.addEventListener("mouseenter", () => onHoverChange?.(item.id));
      outer.addEventListener("mouseleave", () => onHoverChange?.(null));
      outer.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          window.dispatchEvent(new CustomEvent("open-overlay", { detail: { id: item.id } }));
        } catch {}
      });

      return outer;
    };

    const buildPinEl = (item: Item) => {
      const outer = document.createElement("div");
      outer.style.position = "absolute";
      outer.style.transform = "translate(-50%,-50%)";
      outer.style.cursor = "pointer";
      outer.style.userSelect = "none";
      outer.style.zIndex = "1200";

      const dot = document.createElement("div");
      dot.style.width = "14px";
      dot.style.height = "14px";
      dot.style.borderRadius = "9999px";
      dot.style.background = "#2563eb";
      dot.style.border = "2px solid #ffffff";
      dot.style.boxShadow = "0 4px 10px rgba(0,0,0,.25)";
      outer.appendChild(dot);

      outer.addEventListener("mouseenter", () => onHoverChange?.(item.id));
      outer.addEventListener("mouseleave", () => onHoverChange?.(null));
      outer.addEventListener("click", (e) => {
        if (!item.title) return;
        e.preventDefault();
        try {
          if (!infoWindowRef.current) return;
          infoWindowRef.current.setContent(`<div style=\"font-size:12px;font-weight:600\">${String(item.title || "")}</div>`);
          infoWindowRef.current.setPosition({ lat: item.latitude, lng: item.longitude });
          infoWindowRef.current.open({ map });
        } catch {}
      });
      return outer;
    };

    const buildClusterEl = (positionLabel: string, count: number, center: { lat: number; lng: number }) => {
      const outer = document.createElement("div");
      outer.style.position = "absolute";
      outer.style.transform = "translate(-50%,-50%)";
      outer.style.cursor = "pointer";
      outer.style.userSelect = "none";
      outer.style.zIndex = "1300";

      const chip = document.createElement("div");
      chip.style.background = "#ffffff";
      chip.style.color = "#111827";
      chip.style.padding = "6px 9px";
      chip.style.borderRadius = "9999px";
      chip.style.fontWeight = "800";
      chip.style.fontSize = "12px";
      chip.style.boxShadow = "0 6px 16px rgba(0,0,0,.18)";
      chip.style.border = "1px solid #e5e7eb";
      chip.textContent = String(count);
      outer.appendChild(chip);

      outer.addEventListener("click", (e) => {
        e.preventDefault();
        const z = map.getZoom() || 13;
        map.setZoom(Math.min(20, z + 1));
        map.panTo(center);
      });

      return outer;
    };

    const renderItems = () => {
      const zoom = map.getZoom?.();
      if (!isFiniteNumber(zoom)) return;

      clearOverlays(overlaysRef.current);

      const highlighted = highlightedRef.current;
      const clusters = clusterByGrid(items, zoom);

      for (let idx = 0; idx < clusters.length; idx++) {
        const c = clusters[idx];
        if (!c.isCluster) {
          const p = c.items[0];
          const el = simplePin ? buildPinEl(p) : buildPriceBubbleEl(p, p.id === highlighted);
          const ov = createOverlay({ lat: p.latitude, lng: p.longitude }, el);
          overlaysRef.current.push(ov);
          continue;
        }

        const center = { lat: c.lat, lng: c.lng };
        const el = buildClusterEl(`c-${idx}`, c.items.length, center);
        const ov = createOverlay(center, el);
        overlaysRef.current.push(ov);
      }
    };

    const loadPois = async () => {
      if (!pois) return [] as Poi[];
      if (pois.mode === "list") {
        return Array.isArray(pois.items) ? pois.items : [];
      }

      const [lat, lng] = pois.center;
      const radius = Math.max(600, Math.min(1200, Number(pois.radius) || 1000));
      const key = `auto:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
      if (poiKeyRef.current === key && poiListRef.current.length > 0) return poiListRef.current;

      if (poiFetchRef.current && poiKeyRef.current === key) {
        try {
          const list = await poiFetchRef.current;
          return list;
        } catch {
          return [];
        }
      }

      poiKeyRef.current = key;
      poiFetchRef.current = (async () => {
        const url = `/api/pois?lat=${lat}&lng=${lng}&radius=${radius}&perCat=3`;
        const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [] as Poi[];
        const data = await res.json();
        const pts: Poi[] = [];
        const push = (arr: any[], emoji: string) => {
          (arr || []).forEach((p: any) => pts.push({ lat: p.lat, lng: p.lng, label: p.name, emoji }));
        };
        push(data.schools, "🏫");
        push(data.markets, "🛒");
        push(data.pharmacies, "💊");
        push(data.restaurants, "🍽️");
        return pts;
      })();

      try {
        const list = await poiFetchRef.current;
        poiListRef.current = list;
        return list;
      } catch {
        return [];
      }
    };

    const renderPois = async () => {
      clearOverlays(poiOverlaysRef.current);

      const list = await loadPois();
      if (!list || list.length === 0) return;

      for (const p of list) {
        if (!isFiniteNumber(p.lat) || !isFiniteNumber(p.lng)) continue;
        const outer = document.createElement("div");
        outer.style.position = "absolute";
        outer.style.transform = "translate(-50%,-50%)";
        outer.style.cursor = "pointer";
        outer.style.userSelect = "none";
        outer.style.zIndex = "400";

        const dot = document.createElement("div");
        dot.style.width = "24px";
        dot.style.height = "24px";
        dot.style.background = "#ffffff";
        dot.style.color = "#111111";
        dot.style.border = "2px solid #e5e7eb";
        dot.style.display = "flex";
        dot.style.alignItems = "center";
        dot.style.justifyContent = "center";
        dot.style.borderRadius = "9999px";
        dot.style.boxShadow = "0 4px 12px rgba(0,0,0,.15)";
        dot.style.fontSize = "14px";
        dot.textContent = p.emoji || "📍";
        outer.appendChild(dot);

        outer.addEventListener("click", (e) => {
          e.preventDefault();
          try {
            if (!infoWindowRef.current) return;
            infoWindowRef.current.setContent(`<div style=\"font-size:12px;font-weight:600\">${String(p.label || "")}</div>`);
            infoWindowRef.current.setPosition({ lat: p.lat, lng: p.lng });
            infoWindowRef.current.open({ map });
          } catch {}
        });

        const ov = createOverlay({ lat: p.lat, lng: p.lng }, outer);
        poiOverlaysRef.current.push(ov);
      }
    };

    const onIdle = () => {
      try {
        renderItems();
      } catch {}
      try {
        renderPois();
      } catch {}

      try {
        const c = map.getCenter?.();
        const z = map.getZoom?.();
        const b = map.getBounds?.();
        if (c && isFiniteNumber(z)) {
          const payload: any = {
            center: [c.lat(), c.lng()],
            zoom: z,
          };
          if (b) {
            payload.bounds = {
              minLat: b.getSouthWest().lat(),
              maxLat: b.getNorthEast().lat(),
              minLng: b.getSouthWest().lng(),
              maxLng: b.getNorthEast().lng(),
            };
          }
          onViewChange?.(payload);
        }
      } catch {}

      // Fit once by default if no centerZoom; match old behavior
      if (!centerZoom && !hasFitOnceRef.current) {
        hasFitOnceRef.current = true;
        try {
          fitToItems(map, items);
        } catch {}
      }

      if (autoFit) {
        try {
          fitToItems(map, items);
        } catch {}
      }
    };

    redrawRef.current = onIdle;

    // Reattach to avoid stale closures when props change
    try {
      if (idleListenerRef.current) idleListenerRef.current.remove();
    } catch {}
    idleListenerRef.current = null;
    idleListenerRef.current = map.addListener("idle", () => {
      try {
        redrawRef.current?.();
      } catch {}
    });

    // Initial render
    onIdle();

    return () => {
      try {
        if (idleListenerRef.current) idleListenerRef.current.remove();
      } catch {}
      idleListenerRef.current = null;
      redrawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, pois, simplePin, centeredPriceMarkers, autoFit, onViewChange, onHoverChange, centerZoom]);

  const showPlaceholder = !activated || !ready;

  return (
    <div className="h-full w-full overflow-hidden relative rounded-lg shadow-sm border border-gray-200">
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

      {!hideRefitButton && (
        <button
          aria-label="Reiniciar zoom do mapa"
          onClick={() => {
            try {
              window.dispatchEvent(new Event("map-refit"));
            } catch {}
          }}
          className="absolute top-3 right-3 z-[1000] bg-white/95 hover:bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded shadow text-sm"
        >
          Mostrar todos
        </button>
      )}

      {isLoading && <style>{`.gm-style iframe{opacity:.9}`}</style>}
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
  map.fitBounds(bounds, 40);
}
