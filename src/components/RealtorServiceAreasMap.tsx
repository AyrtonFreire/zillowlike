"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

interface RealtorServiceAreasMapProps {
  areas: string[];
  city?: string;
  state?: string;
}

const Map = dynamic(() => import("@/components/GoogleMap"), { ssr: false });

// Geocode uma área para obter coordenadas
async function geocodeArea(area: string, city?: string, state?: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const query = `${area}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}, Brasil`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    const res = await fetch(url, {
      headers: { "User-Agent": "OggaHub/1.0" },
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

  const mapItems = useMemo(() => {
    return (markers || []).map((m, i) => ({
      id: `area-${i}`,
      price: 0,
      latitude: m.lat,
      longitude: m.lng,
      title: m.name,
    }));
  }, [markers]);

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
        <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
          <Map
            items={mapItems}
            simplePin
            hideRefitButton
            autoLoad={false}
            centerZoom={mapItems[0] ? { center: [mapItems[0].latitude, mapItems[0].longitude], zoom: 11 } : undefined}
          />
        </div>
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
