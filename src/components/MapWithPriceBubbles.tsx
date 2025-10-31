"use client";

import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

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
  autoFitOnItemsChange?: boolean; // default: false (não mover automaticamente)
  onHoverChange?: (id: string | null) => void; // notifica página para destacar card
};

function PriceBubbleIcon(price: number, isHighlighted: boolean) {
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price / 100);

  return L.divIcon({
    className: "price-bubble-marker",
    html: `
      <div class="price-bubble ${isHighlighted ? 'highlighted' : ''}" style="
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: ${isHighlighted ? '#2563eb' : '#ffffff'};
        color: ${isHighlighted ? '#ffffff' : '#1f2937'};
        padding: 8px 14px;
        border-radius: 24px;
        font-weight: 700;
        font-size: 13px;
        box-shadow: ${isHighlighted ? '0 8px 24px rgba(37, 99, 235, 0.4), 0 0 0 3px rgba(37, 99, 235, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.15)'};
        border: ${isHighlighted ? '2px solid #1d4ed8' : '2px solid #e5e7eb'};
        white-space: nowrap;
        transform: ${isHighlighted ? 'scale(1.15)' : 'scale(1)'};
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: ${isHighlighted ? '1000' : '100'};
        cursor: pointer;
      ">
        ${formattedPrice}
        <div style="
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: -6px;
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid ${isHighlighted ? '#2563eb' : '#ffffff'};
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function ClusterIcon(count: number, isHighlighted: boolean) {
  // Size based on count
  const size = count > 50 ? 64 : count > 20 ? 56 : count > 10 ? 52 : 48;
  const fontSize = count > 50 ? 20 : count > 20 ? 18 : count > 10 ? 17 : 16;
  
  return L.divIcon({
    className: "cluster-marker",
    html: `
      <div style="
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, ${isHighlighted ? '#3b82f6' : '#1d4ed8'} 0%, ${isHighlighted ? '#1d4ed8' : '#1e40af'} 100%);
        color: #ffffff;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        font-weight: 800;
        font-size: ${fontSize}px;
        box-shadow: ${isHighlighted 
          ? '0 12px 32px rgba(37, 99, 235, 0.6), 0 0 0 5px rgba(37, 99, 235, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.2)' 
          : '0 8px 24px rgba(29, 78, 216, 0.5), 0 0 0 3px rgba(255, 255, 255, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.2)'};
        transform: ${isHighlighted ? 'scale(1.2)' : 'scale(1)'};
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: ${isHighlighted ? '1000' : '500'};
        cursor: pointer;
      ">
        <span style="position: relative; z-index: 2;">${count}</span>
        <div style="
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          background: radial-gradient(circle, ${isHighlighted ? 'rgba(37, 99, 235, 0.3)' : 'rgba(29, 78, 216, 0.2)'} 0%, transparent 70%);
          animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        "></div>
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          opacity: ${isHighlighted ? '1' : '0'};
          transition: opacity 0.2s;
        ">Clique para expandir</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Helper function to offset overlapping markers
function offsetPosition(lat: number, lng: number, index: number, total: number): [number, number] {
  if (total === 1) return [lat, lng];
  
  // Create a circular offset pattern
  const angle = (index / total) * Math.PI * 2;
  const radius = 0.0001; // Small offset in degrees (~11 meters)
  
  const offsetLat = lat + (Math.sin(angle) * radius);
  const offsetLng = lng + (Math.cos(angle) * radius);
  
  return [offsetLat, offsetLng];
}

function MapController({ items, onBoundsChange, autoFitOnItemsChange = false, onHoverChange }: { items: Item[]; onBoundsChange?: (bounds: any) => void; autoFitOnItemsChange?: boolean; onHoverChange?: (id: string | null) => void }) {
  const map = useMap();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(map.getZoom());
  const debounceRef = useRef<any>(null);
  
  // Track zoom changes
  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });
  
  // Cluster items based on zoom level with proximity merging
  const clusters = useMemo(() => {
    const validItems = items.filter(
      item => item.latitude && item.longitude && item.latitude !== 0 && item.longitude !== 0
    );
    
    // Determine grid size and clustering behavior based on zoom
    let gridSize: number;
    let forceCluster: boolean;
    let mergeDistance: number; // Distance in pixels to merge clusters
    
    if (zoom >= 15) {
      gridSize = 0.0001;
      forceCluster = false;
      mergeDistance = 0; // No merging at high zoom
    } else if (zoom >= 13) {
      gridSize = 0.002;
      forceCluster = false;
      mergeDistance = 60; // Merge if closer than 60px
    } else if (zoom >= 11) {
      gridSize = 0.01;
      forceCluster = true;
      mergeDistance = 80; // More aggressive merging
    } else if (zoom >= 9) {
      gridSize = 0.03;
      forceCluster = true;
      mergeDistance = 100;
    } else {
      gridSize = 0.08;
      forceCluster = true;
      mergeDistance = 120;
    }
    
    // Step 1: Initial grid-based clustering
    const clusterMap = new Map<string, Item[]>();
    
    validItems.forEach(item => {
      const gridLat = Math.floor(item.latitude / gridSize) * gridSize;
      const gridLng = Math.floor(item.longitude / gridSize) * gridSize;
      const key = `${gridLat.toFixed(6)},${gridLng.toFixed(6)}`;
      
      const existing = clusterMap.get(key) || [];
      existing.push(item);
      clusterMap.set(key, existing);
    });
    
    // Step 2: Create initial clusters with centers
    let initialClusters = Array.from(clusterMap.values()).map(group => {
      const avgLat = group.reduce((sum, item) => sum + item.latitude, 0) / group.length;
      const avgLng = group.reduce((sum, item) => sum + item.longitude, 0) / group.length;
      
      return {
        items: group,
        lat: avgLat,
        lng: avgLng,
        isCluster: forceCluster || group.length >= 3,
      };
    });
    
    // Step 3: Merge clusters that are too close (proximity-based merging)
    if (mergeDistance > 0) {
      // Convert lat/lng distance to approximate pixel distance at current zoom
      // At zoom level, 1 degree ≈ 256 * 2^zoom pixels (simplified)
      const pixelsPerDegree = 256 * Math.pow(2, zoom) / 360;
      const degreeThreshold = mergeDistance / pixelsPerDegree;
      
      let merged = true;
      while (merged) {
        merged = false;
        
        for (let i = 0; i < initialClusters.length; i++) {
          for (let j = i + 1; j < initialClusters.length; j++) {
            const c1 = initialClusters[i];
            const c2 = initialClusters[j];
            
            // Calculate distance between cluster centers
            const latDiff = c1.lat - c2.lat;
            const lngDiff = c1.lng - c2.lng;
            const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
            
            // If clusters are too close, merge them
            if (distance < degreeThreshold) {
              // Merge c2 into c1
              const allItems = [...c1.items, ...c2.items];
              const newLat = allItems.reduce((sum, item) => sum + item.latitude, 0) / allItems.length;
              const newLng = allItems.reduce((sum, item) => sum + item.longitude, 0) / allItems.length;
              
              initialClusters[i] = {
                items: allItems,
                lat: newLat,
                lng: newLng,
                isCluster: forceCluster || allItems.length >= 3,
              };
              
              // Remove c2
              initialClusters.splice(j, 1);
              merged = true;
              break;
            }
          }
          if (merged) break;
        }
      }
    }
    
    return initialClusters;
  }, [items, zoom]);

  // Auto-fit map to items when they change - SEMPRE ajustar quando items mudam
  const prevItemsCountRef = useRef(0);
  const prevFirstItemRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentFirstId = items[0]?.id;
    const itemsChanged = items.length !== prevItemsCountRef.current || currentFirstId !== prevFirstItemRef.current;
    
    if (items.length > 0 && itemsChanged) {
      const bounds = L.latLngBounds(items.map(p => [p.latitude, p.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
    prevItemsCountRef.current = items.length;
    prevFirstItemRef.current = currentFirstId;
  }, [items, map]);

  // Listen for highlight events
  useEffect(() => {
    const handleHighlight = (e: Event) => {
      const customEvent = e as CustomEvent;
      setHighlightedId(customEvent.detail?.id || null);
    };

    const handleUnhighlight = () => {
      setHighlightedId(null);
      try {
        window.dispatchEvent(new CustomEvent('list-highlight-card', { detail: { id: null } }));
      } catch {}
      onHoverChange?.(null);
    };

    window.addEventListener('map-highlight-marker', handleHighlight);
    window.addEventListener('map-unhighlight-marker', handleUnhighlight);

    return () => {
      window.removeEventListener('map-highlight-marker', handleHighlight);
      window.removeEventListener('map-unhighlight-marker', handleUnhighlight);
    };
  }, []);

  // Handle map movement and trigger search
  useMapEvents({
    moveend() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      
      debounceRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        onBoundsChange?.({
          minLat: bounds.getSouth(),
          maxLat: bounds.getNorth(),
          minLng: bounds.getWest(),
          maxLng: bounds.getEast(),
        });
      }, 500); // Debounce 500ms
    },
  });

  // Invalidate size on resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  return (
    <>
      {clusters.map((cluster, clusterIndex) => {
        if (cluster.isCluster) {
          // Render cluster marker
          const clusterKey = `cluster-${cluster.lat}-${cluster.lng}-${cluster.items.length}`;
          const isHighlighted = cluster.items.some(item => item.id === highlightedId);
          
          return (
            <Marker
              key={clusterKey}
              position={[cluster.lat, cluster.lng]}
              icon={ClusterIcon(cluster.items.length, isHighlighted)}
              eventHandlers={{
                click: () => {
                  // Zoom in to expand cluster
                  map.setView([cluster.lat, cluster.lng], Math.min(zoom + 2, 18), { animate: true });
                },
                mouseover: () => {
                  // Highlight first item in cluster
                  if (cluster.items[0]) {
                    const firstId = cluster.items[0].id;
                    setHighlightedId(firstId);
                    try { window.dispatchEvent(new CustomEvent('list-highlight-card', { detail: { id: firstId } })); } catch {}
                    onHoverChange?.(firstId);
                  }
                },
                mouseout: () => {
                  setHighlightedId(null);
                  try { window.dispatchEvent(new CustomEvent('list-highlight-card', { detail: { id: null } })); } catch {}
                  onHoverChange?.(null);
                },
              }}
            />
          );
        } else {
          // Render individual markers with offset
          return cluster.items.map((item, index) => {
            const [offsetLat, offsetLng] = offsetPosition(
              cluster.lat,
              cluster.lng,
              index,
              cluster.items.length
            );
            
            return (
              <Marker
                key={item.id}
                position={[offsetLat, offsetLng]}
                icon={PriceBubbleIcon(item.price, highlightedId === item.id)}
                eventHandlers={{
                  click: () => {
                    window.dispatchEvent(new CustomEvent('open-overlay', { detail: { id: item.id } }));
                  },
                  mouseover: () => {
                    setHighlightedId(item.id);
                    try { window.dispatchEvent(new CustomEvent('list-highlight-card', { detail: { id: item.id } })); } catch {}
                    onHoverChange?.(item.id);
                  },
                  mouseout: () => {
                    setHighlightedId(null);
                    try { window.dispatchEvent(new CustomEvent('list-highlight-card', { detail: { id: null } })); } catch {}
                    onHoverChange?.(null);
                  },
                }}
              />
            );
          });
        }
      })}
    </>
  );
}

export default function MapWithPriceBubbles({ items, isLoading, onBoundsChange, autoFitOnItemsChange = false, onHoverChange }: MapProps) {
  // Centro dinâmico: atualiza quando os itens mudarem
  const center: [number, number] = items.length > 0
    ? [items[0].latitude, items[0].longitude]
    : [-9.4048, -40.5058];

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
    <MapContainer
      center={center}
      zoom={13}
      className="w-full h-full"
      zoomControl={false}
      scrollWheelZoom={true}
      doubleClickZoom={true}
      touchZoom={true}
      dragging={true}
      zoomSnap={0.5}
      zoomDelta={1}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        minZoom={3}
      />
      <ZoomControl position="bottomright" />
      <MapController items={items} onBoundsChange={onBoundsChange} autoFitOnItemsChange={autoFitOnItemsChange} onHoverChange={onHoverChange} />
    </MapContainer>
  );
}
