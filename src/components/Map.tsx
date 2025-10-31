"use client";

import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
 

type Item = {
  id: string;
  price: number;
  latitude: number;
  longitude: number;
};

function useIconCache() {
  const priceCache = useRef<globalThis.Map<string, L.DivIcon>>(new globalThis.Map());
  const clusterCache = useRef<globalThis.Map<number, L.DivIcon>>(new globalThis.Map());
  const getPriceIcon = (id: string, label: string, highlight?: boolean) => {
    const key = `${id}-${label}-${highlight ? 1 : 0}`;
    const cached = priceCache.current.get(key);
    if (cached) return cached;
    const icon = L.divIcon({
      className: "price-marker",
      html: `
        <div style="position:relative;display:inline-block;background:${highlight ? '#0ea5e9' : '#1d4ed8'};color:#ffffff;padding:5px 9px;border-radius:12px;font-weight:800;font-size:11px;letter-spacing:.1px;box-shadow:0 8px 24px rgba(0,0,0,.25);white-space:nowrap;transform:${highlight ? 'scale(1.04)' : 'scale(1)'};transition:transform .15s ease">
          ${label}
          <div style="position:absolute;left:50%;transform:translateX(-50%);bottom:-8px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid ${highlight ? '#0ea5e9' : '#1d4ed8'}"></div>
        </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 18],
    });
    priceCache.current.set(key, icon);
    return icon;
  };
  const getClusterIcon = (count: number) => {
    const cached = clusterCache.current.get(count);
    if (cached) return cached;
    const icon = L.divIcon({
      className: "cluster-marker",
      html: `<div style="background:#ffffff;color:#111827;padding:6px 9px;border-radius:9999px;font-weight:800;font-size:12px;box-shadow:0 6px 16px rgba(0,0,0,.18);border:1px solid #e5e7eb">${count}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    clusterCache.current.set(count, icon);
    return icon;
  };
  return { getPriceIcon, getClusterIcon };
}

type Poi = { lat: number; lng: number; label: string; emoji?: string };
type PoisProp =
  | { mode: 'list'; items: Poi[] }
  | { mode: 'auto'; center: [number, number]; radius?: number };

export default function Map({ items, centerZoom, onViewChange, highlightId, onHoverChange, autoFit, hideRefitButton, isLoading, pois, simplePin }: { items: Item[]; centerZoom?: { center: [number, number]; zoom: number }; onViewChange?: (v: { center: [number, number]; zoom: number; bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number } }) => void; highlightId?: string; onHoverChange?: (id: string | null) => void; autoFit?: boolean; hideRefitButton?: boolean; isLoading?: boolean; pois?: PoisProp; simplePin?: boolean }) {
  const center = useMemo(() => {
    if (items.length > 0) return [items[0].latitude, items[0].longitude] as [number, number];
    // Default to Petrolina/Juazeiro midpoint
    return [-9.4048, -40.5058] as [number, number];
  }, [items]);

  // Remove previous pop animations to avoid flicker on rerenders

  // (Removed CARTO tone CSS and style selector to use only OSM)

  function FitBounds({ points }: { points: Item[] }) {
    const map = useMap();
    useEffect(() => {
      if (!points || points.length === 0) return;
      // if parent is controlling center/zoom, do not auto fit
      // we detect it indirectly: if a "map-refit" event is triggered, we will re-fit anyway
      if (points.length === 1) {
        map.setView([points[0].latitude, points[0].longitude], 13);
        return;
      }
      const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }, [points, map]);
    return null;
  }

  function PoiMarkers({ config }: { config?: PoisProp }) {
    const map = useMap();
    const [list, setList] = useState<Poi[]>([]);
    useEffect(() => {
      let ignore = false;
      async function loadAuto(center: [number, number], radius: number) {
        try {
          const [lat, lng] = center;
          const url = `/api/pois?lat=${lat}&lng=${lng}&radius=${radius}&perCat=3`;
          const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
          if (!res.ok) { console.warn('POIs unavailable'); return; }
          const data = await res.json();
          const pts: Poi[] = [];
          const push = (arr: any[], emoji: string) => {
            (arr || []).forEach((p: any) => pts.push({ lat: p.lat, lng: p.lng, label: p.name, emoji }));
          };
          push(data.schools, '🏫');
          push(data.markets, '🛒');
          push(data.pharmacies, '💊');
          push(data.restaurants, '🍽️');
          if (!ignore) setList(pts);
        } catch (err) {
          console.warn('POIs load failed (silent):', err);
        }
      }
      if (!config) { setList([]); return; }
      if (config.mode === 'list') {
        setList(config.items || []);
      } else if (config.mode === 'auto') {
        const r = Math.max(600, Math.min(1200, Number(config.radius) || 1000));
        loadAuto(config.center, r);
      }
      return () => { ignore = true; };
    }, [config]);
    if (!list || list.length === 0) return null;
    return (
      <>
        {list.map((p, i) => (
          <Marker
            key={`poi-${i}`}
            position={[p.lat, p.lng]}
            icon={L.divIcon({
              className: 'poi-marker',
              html: `<div style="width:24px;height:24px;background:#fff;color:#111;border:2px solid #e5e7eb;display:flex;align-items:center;justify-content:center;border-radius:9999px;box-shadow:0 4px 12px rgba(0,0,0,.15);font-size:14px">${p.emoji || '📍'}</div>`,
              iconSize: [24, 24], 
              iconAnchor: [12, 12]
            })}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
              <span className="text-xs font-medium">{p.label}</span>
            </Tooltip>
          </Marker>
        ))}
      </>
    );
  }

  // Extra safety: after map load, invalidate again to avoid any subpixel gap
  function EnsureFullRender() {
    const map = useMap();
    useEffect(() => {
      let t1: any, t2: any;
      const safeInvalidate = () => {
        if (!(map as any)?._leaflet_id) return;
        const container = map.getContainer?.();
        if (!container || !container.isConnected) return;
        try { map.invalidateSize({ animate: false }); } catch {}
      };
      const kick = () => {
        safeInvalidate();
        t1 = setTimeout(safeInvalidate, 150);
        t2 = setTimeout(safeInvalidate, 350);
      };
      if ((map as any)?._loaded) kick();
      map.once?.('load', kick);
      return () => { if (t1) clearTimeout(t1); if (t2) clearTimeout(t2); };
    }, [map]);
    return null;
  }

  // Optional: fit bounds whenever items change and autoFit is on
  function FitOnItems({ points }: { points: Item[] }) {
    const map = useMap();
    useEffect(() => {
      if (!autoFit || !points || points.length === 0) return;
      if (points.length === 1) {
        map.setView([points[0].latitude, points[0].longitude], Math.max(map.getZoom(), 13));
        return;
      }
      const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }, [points, autoFit, map]);
    return null;
  }

  // Listen to external center events
  function CenterOnEvent() {
    const map = useMap();
    useEffect(() => {
      function handler(e: any) {
        const { lat, lng, zoom } = (e as CustomEvent)?.detail || {};
        if (typeof lat === 'number' && typeof lng === 'number') {
          const targetZoom = typeof zoom === 'number' ? zoom : Math.max(map.getZoom(), 13);
          map.setView([lat, lng], targetZoom, { animate: true });
        }
      }
      window.addEventListener('map-center-to', handler as EventListener);
      return () => window.removeEventListener('map-center-to', handler as EventListener);
    }, [map]);
    return null;
  }

  function RefitOnEvent({ points }: { points: Item[] }) {
    const map = useMap();
    useEffect(() => {
      function handler() {
        if (!points || points.length === 0) return;
        if (points.length === 1) {
          map.setView([points[0].latitude, points[0].longitude], 13);
          return;
        }
        const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
      window.addEventListener("map-refit", handler as EventListener);
      return () => window.removeEventListener("map-refit", handler as EventListener);
    }, [points, map]);
    return null;
  }

  function ViewSync() {
    const tRef = useRef<any>(null);
    useMapEvents({
      moveend(e) {
        const m = e.target as any;
        const c = m.getCenter();
        const z = m.getZoom();
        const b = m.getBounds();
        if (tRef.current) clearTimeout(tRef.current);
        tRef.current = setTimeout(() => {
          onViewChange?.({
            center: [c.lat, c.lng],
            zoom: z,
            bounds: { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() }
          });
        }, 250); // debounce
      }
    });
    return null;
  }

  // Ensure map recalculates size to avoid blank gaps on edges
  function InvalidateOnResize() {
    const map = useMap();
    useEffect(() => {
      let t: any;
      const invalidate = () => {
        // small delay allows CSS/layout to settle
        if (!(map as any)?._leaflet_id) return; // map not ready or unmounted
        const container = map.getContainer?.();
        if (!container || !container.isConnected) return;
        t = setTimeout(() => {
          if (!(map as any)?._leaflet_id) return;
          const c = map.getContainer?.();
          if (!c || !c.isConnected) return;
          try { map.invalidateSize({ animate: false }); } catch {}
        }, 50);
      };
      invalidate();
      if (typeof window !== 'undefined') window.addEventListener('resize', invalidate);
      const el = map.getContainer();
      let ro: ResizeObserver | null = null;
      if ('ResizeObserver' in window && el) {
        ro = new ResizeObserver(() => invalidate());
        ro.observe(el);
      }
      const handler = () => invalidate();
      window.addEventListener('map-invalidate', handler as EventListener);
      return () => {
        if (typeof window !== 'undefined') window.removeEventListener('resize', invalidate);
        if (ro && el) ro.unobserve(el);
        window.removeEventListener('map-invalidate', handler as EventListener);
        if (t) clearTimeout(t);
      };
    }, [map]);
    return null;
  }

  // Slightly offset markers that share the exact same lat/lng to avoid perfect overlap
  function offsetLatLng(lat: number, lng: number, idx: number, total: number, meters = 12) {
    if (total <= 1) return [lat, lng] as [number, number];
    const angle = (idx / total) * Math.PI * 2;
    const dx = Math.cos(angle) * meters;
    const dy = Math.sin(angle) * meters;
    const dLat = dy / 111111; // meters to degrees
    const dLng = dx / (111111 * Math.cos((lat * Math.PI) / 180));
    return [lat + dLat, lng + dLng] as [number, number];
  }

  // Cluster markers by grid in pixel space for current zoom
  function ClusterMarkers({ points }: { points: Item[] }) {
    const map = useMap();
    const { getPriceIcon, getClusterIcon } = useIconCache();
    const zoom = map.getZoom();
    const grid = zoom < 12 ? 80 : zoom < 15 ? 60 : 40; // pixels por zoom
    // group by pixel grid (memoized for current points+zoom)
    const clusters = useMemo(() => {
      const groups = new globalThis.Map<string, Item[]>();
      points.forEach((p) => {
        const pt = map.project([p.latitude, p.longitude] as any, zoom);
        const gx = Math.floor(pt.x / grid);
        const gy = Math.floor(pt.y / grid);
        const key = `${gx},${gy}`;
        const arr = groups.get(key) || [];
        arr.push(p);
        groups.set(key, arr);
      });
      return Array.from(groups.values()) as Item[][];
    }, [points, map, zoom, grid]);

    return (
      <>
        {clusters.map((arr, idx) => {
          if (arr.length === 1) {
            const p = arr[0];
            // Simple pin mode: render a minimal round marker without tooltip/link
            if (simplePin) {
              const pin = L.divIcon({
                className: 'pin-marker',
                html: `<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,.25)"></div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 9],
              });
              return (
                <Marker
                  key={p.id}
                  position={[p.latitude, p.longitude]}
                  icon={pin}
                  eventHandlers={{
                    mouseover: () => onHoverChange?.(p.id),
                    mouseout: () => onHoverChange?.(null),
                  }}
                />
              );
            }
            return (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                icon={getPriceIcon(p.id, `R$ ${(p.price / 100).toLocaleString('pt-BR')}`, p.id === highlightId)}
                eventHandlers={{
                  mouseover: () => onHoverChange?.(p.id),
                  mouseout: () => onHoverChange?.(null),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      try {
                        window.dispatchEvent(new CustomEvent('open-overlay', { detail: { id: p.id } }));
                      } catch {}
                    }}
                    className="underline decoration-dotted hover:decoration-solid text-white bg-transparent"
                  >
                    R$ {(p.price / 100).toLocaleString('pt-BR')}
                  </button>
                </Tooltip>
              </Marker>
            );
          }
          // cluster position = average of lat/lng
          const lat = arr.reduce((s, i) => s + i.latitude, 0) / arr.length;
          const lng = arr.reduce((s, i) => s + i.longitude, 0) / arr.length;
          return (
            <Marker
              key={`c-${idx}`}
              position={[lat, lng]}
              icon={getClusterIcon(arr.length)}
              eventHandlers={{
                click: () => {
                  map.setView([lat, lng], Math.min(20, map.getZoom() + 1));
                }
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                {arr.length} resultados nesta área
              </Tooltip>
            </Marker>
          );
        })}
      </>
    );
  }

  return (
    <div className={`h-full w-full overflow-hidden relative rounded-lg shadow-sm border border-gray-200`}>
      <MapContainer className="absolute inset-0" center={centerZoom?.center ?? center} zoom={centerZoom?.zoom ?? 13} attributionControl={false}>
        {!centerZoom && <FitBounds points={items} />}
        <RefitOnEvent points={items} />
        <FitOnItems points={items} />
        <ViewSync />
        <InvalidateOnResize />
        <EnsureFullRender />
        <CenterOnEvent />
        {/* OSM Standard only */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClusterMarkers points={items} />
        <PoiMarkers config={pois}
        />
        {/* Compact custom attribution */}
      </MapContainer>
      {isLoading && (
        <style>{`.leaflet-marker-icon{opacity:.6;filter:saturate(.9)}`}</style>
      )}
      <div className="absolute right-2 bottom-2 pointer-events-none select-none text-[10px] text-gray-600 bg-white/80 px-2 py-0.5 rounded shadow">
        © OpenStreetMap contributors
      </div>
      {!hideRefitButton && (
        <button
          aria-label="Reiniciar zoom do mapa"
          onClick={() => {
            // Trigger a global refit event, handled inside the map via RefitOnEvent
            window.dispatchEvent(new Event("map-refit"));
          }}
          className="absolute top-3 right-3 z-[1000] bg-white/95 hover:bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded shadow text-sm"
        >
          Mostrar todos
        </button>
      )}
    </div>
  );
}


