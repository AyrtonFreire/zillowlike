"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { X, Plus, Home, Bed, Bath, Maximize2, MapPin, DollarSign, Check, Minus } from "lucide-react";

interface Property {
  id: string;
  title: string;
  price: number;
  type: string;
  city: string;
  state: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  images: { url: string }[];
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = searchParams.get("ids")?.split(",") || [];
    if (ids.length > 0) {
      fetchProperties(ids);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchProperties = async (ids: string[]) => {
    try {
      const promises = ids.map(id =>
        fetch(`/api/properties?id=${id}`).then(r => r.json())
      );
      const results = await Promise.all(promises);
      const props = results.map(r => r.item).filter(Boolean);
      setProperties(props);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const removeProperty = (id: string) => {
    const filtered = properties.filter(p => p.id !== id);
    setProperties(filtered);
    
    // Update URL
    const ids = filtered.map(p => p.id).join(",");
    window.history.replaceState({}, "", ids ? `/compare?ids=${ids}` : "/compare");
  };

  const compareFeatures = [
    { label: "Preço", key: "price", format: (v: any) => formatPrice(v) },
    { label: "Tipo", key: "type" },
    { label: "Quartos", key: "bedrooms", icon: Bed },
    { label: "Banheiros", key: "bathrooms", icon: Bath },
    { label: "Área (m²)", key: "areaM2", icon: Maximize2 },
    { label: "Localização", key: "location", format: (v: any, p: Property) => `${p.city}, ${p.state}`, icon: MapPin },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Comparar Imóveis
          </h1>
          <p className="text-gray-600">
            Compare características lado a lado
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum imóvel para comparar
            </h3>
            <p className="text-gray-600 mb-6">
              Adicione imóveis para comparar suas características
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Buscar Imóveis
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="sticky left-0 z-10 bg-gray-50 p-4 text-left font-semibold text-gray-900">
                      Característica
                    </th>
                    {properties.map((property) => (
                      <th key={property.id} className="p-4 min-w-[300px]">
                        <div className="relative">
                          {/* Image */}
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                            {property.images[0] ? (
                              <Image
                                src={property.images[0].url}
                                alt={property.title}
                                width={300}
                                height={200}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="w-12 h-12 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                            {property.title}
                          </h3>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeProperty(property.id)}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* View Button */}
                          <Link
                            href={`/property/${property.id}`}
                            className="block w-full mt-2 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium text-center border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            Ver Detalhes
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareFeatures.map((feature, index) => (
                    <tr
                      key={feature.key}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="sticky left-0 z-10 p-4 font-medium text-gray-900 bg-inherit">
                        <div className="flex items-center gap-2">
                          {feature.icon && <feature.icon className="w-4 h-4 text-gray-400" />}
                          {feature.label}
                        </div>
                      </td>
                      {properties.map((property) => {
                        const value = feature.format
                          ? feature.format(property[feature.key as keyof Property], property)
                          : property[feature.key as keyof Property];
                        
                        return (
                          <td key={property.id} className="p-4 text-center">
                            {value !== null && value !== undefined ? (
                              <span className="text-gray-900">{String(value)}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Price per m² */}
                  <tr className="bg-blue-50">
                    <td className="sticky left-0 z-10 p-4 font-medium text-gray-900 bg-blue-50">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        Preço por m²
                      </div>
                    </td>
                    {properties.map((property) => {
                      const pricePerM2 = property.areaM2
                        ? ((property.price / 100) / property.areaM2).toFixed(2)
                        : null;
                      
                      return (
                        <td key={property.id} className="p-4 text-center font-semibold text-blue-600">
                          {pricePerM2 ? `R$ ${pricePerM2}` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
