"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Home, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PropertyListItem from "@/components/dashboard/PropertyListItem";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";

interface BrokerProperty {
  id: string;
  title: string;
  price: number;
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  image: string | null;
  views: number;
  leads: number;
  scheduledVisits: number;
  completedVisits: number;
  pendingApprovals: number;
}

export default function BrokerPropertiesPage() {
  const { status } = useSession();

  const [properties, setProperties] = useState<BrokerProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchProperties();
  }, [status]);

  const fetchProperties = async () => {
    try {
      setError(null);
      setLoading(true);

      // Reaproveita a mesma API de propriedades do proprietário,
      // mas aqui enxergando como "estoque" do corretor.
      const response = await fetch("/api/owner/properties");
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Não conseguimos carregar seus imóveis agora. Se quiser, tente novamente em alguns instantes."
        );
      }

      setProperties(Array.isArray(data.properties) ? data.properties : []);
    } catch (err: any) {
      console.error("Error fetching broker properties:", err);
      setError(
        err?.message ||
          "Não conseguimos carregar seus imóveis agora. Se quiser, tente novamente em alguns instantes."
      );
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout
        title="Meus imóveis"
        description="Veja de forma simples os imóveis do seu estoque e os leads gerados em cada um."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Corretor", href: "/broker/dashboard" },
          { label: "Meus imóveis" },
        ]}
      >
        <CenteredSpinner message="Carregando seus imóveis..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Meus imóveis"
      description="Veja de forma simples os imóveis do seu estoque e os leads gerados em cada um."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Meus imóveis" },
      ]}
      actions={
        <Link
          href="/owner/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-200 bg-white text-teal-700 hover:bg-teal-50 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo anúncio
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
            {error}
          </div>
        )}

        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <EmptyState
              icon={<Home className="w-12 h-12 mx-auto mb-3 text-gray-300" />}
              title="Você ainda não tem imóveis cadastrados"
              description="Assim que você criar seus anúncios, eles aparecem aqui para você acompanhar leads, visitas e negociações."
              action={
                <Link
                  href="/owner/new"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-teal-200 bg-white text-teal-700 hover:bg-teal-50 font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Criar primeiro anúncio
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map((property) => (
              <div key={property.id} className="space-y-2">
                <PropertyListItem
                  id={property.id}
                  title={property.title}
                  price={property.price}
                  image={property.image || "/placeholder.jpg"}
                  status={property.status}
                  views={property.views}
                  leads={property.leads}
                  scheduledVisits={property.scheduledVisits}
                  completedVisits={property.completedVisits}
                  pendingApprovals={property.pendingApprovals}
                />
                <div className="flex justify-end">
                  <Link
                    href={`/broker/properties/${property.id}`}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver leads &amp; negociação
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
