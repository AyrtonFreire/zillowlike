"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RealtorServiceAreasMapProps {
  areas: string[];
  city?: string;
  state?: string;
}

// Geocode uma área para obter coordenadas
async function geocodeArea(area: string, city?: string, state?: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const query = `${area}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}, Brasil`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    const res = await fetch(url, {
      headers: { "User-Agent": "ZillowLike/1.0" },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: area,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function RealtorServiceAreasMap({ areas, city, state }: RealtorServiceAreasMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<{ lat: number; lng: number; name: string }[]>([]);

  // Geocodificar todas as áreas
  useEffect(() => {
    if (areas.length === 0) {
      setLoading(false);
      return;
    }

    const geocodeAll = async () => {
      setLoading(true);
      const results = await Promise.all(
        areas.slice(0, 10).map((area) => geocodeArea(area, city, state))
      );
      const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);
      setMarkers(validResults);
      setLoading(false);
    };

    geocodeAll();
  }, [areas, city, state]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || loading || markers.length === 0) return;

    // Limpar mapa anterior
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Calcular centro e bounds
    const lats = markers.map((m) => m.lat);
    const lngs = markers.map((m) => m.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    // Criar mapa
    const map = L.map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Ícone customizado
    const customIcon = L.divIcon({
      html: `<div class="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full shadow-lg border-2 border-white">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      </div>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    // Adicionar marcadores
    markers.forEach((marker) => {
      L.marker([marker.lat, marker.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`<strong>${marker.name}</strong>`);
    });

    // Ajustar zoom para mostrar todos os marcadores
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, markers]);

  if (areas.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-purple-600" />
        Mapa de atuação
      </h2>

      {loading ? (
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : markers.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl text-gray-500">
          <MapPin className="w-8 h-8 mb-2 text-gray-300" />
          <p className="text-sm">Não foi possível localizar as áreas no mapa.</p>
        </div>
      ) : (
        <div
          ref={mapRef}
          className="h-64 rounded-xl overflow-hidden border border-gray-200"
        />
      )}

      {/* Tags das áreas abaixo do mapa */}
      <div className="mt-4 flex flex-wrap gap-2">
        {areas.map((area) => (
          <span
            key={area}
            className="inline-flex items-center px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100"
          >
            {area}
          </span>
        ))}
      </div>
    </section>
  );
}
