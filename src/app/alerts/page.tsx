"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell, Plus, Trash2, Edit2, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface Alert {
  id: string;
  name: string;
  filters: any;
  frequency: string;
  createdAt: string;
  _count?: {
    notifications: number;
  };
}

export default function AlertsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAlert, setShowNewAlert] = useState(false);

  // New alert form
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("PE");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [frequency, setFrequency] = useState("DAILY");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      fetchAlerts();
    }
  }, [status, router]);

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/alerts");
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          city: city || undefined,
          state: state || undefined,
          minPrice: minPrice ? parseInt(minPrice) * 100 : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) * 100 : undefined,
          propertyType: propertyType || undefined,
          minBedrooms: minBedrooms ? parseInt(minBedrooms) : undefined,
          frequency,
        }),
      });

      if (response.ok) {
        fetchAlerts();
        setShowNewAlert(false);
        // Reset form
        setName("");
        setCity("");
        setMinPrice("");
        setMaxPrice("");
        setPropertyType("");
        setMinBedrooms("");
      }
    } catch (error) {
      console.error("Error creating alert:", error);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este alerta?")) return;

    try {
      const response = await fetch(`/api/alerts?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAlerts(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const getFrequencyLabel = (freq: string) => {
    const labels = {
      INSTANT: "Instantâneo",
      DAILY: "Diário",
      WEEKLY: "Semanal",
    };
    return labels[freq as keyof typeof labels] || freq;
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Meus Alertas"
        description="Gerenciar alertas de imóveis"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Alertas" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Meus Alertas"
      description={`${alerts.length} alerta${alerts.length !== 1 ? "s" : ""} ativo${alerts.length !== 1 ? "s" : ""}`}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Alertas" },
      ]}
      actions={
        <button
          onClick={() => setShowNewAlert(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Alerta
        </button>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* New Alert Form */}
        {showNewAlert && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Criar Novo Alerta</h2>
                <button
                  onClick={() => setShowNewAlert(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAlert} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Alerta *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Apartamentos em Petrolina"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Petrolina"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="PE"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço Mínimo (R$)
                    </label>
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="200000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço Máximo (R$)
                    </label>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="500000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Imóvel
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos</option>
                      <option value="HOUSE">Casa</option>
                      <option value="APARTMENT">Apartamento</option>
                      <option value="CONDO">Condomínio</option>
                      <option value="LAND">Terreno</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mínimo de Quartos
                    </label>
                    <input
                      type="number"
                      value={minBedrooms}
                      onChange={(e) => setMinBedrooms(e.target.value)}
                      placeholder="2"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequência de Notificações
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="INSTANT">Instantâneo (imediato)</option>
                    <option value="DAILY">Diário (resumo diário)</option>
                    <option value="WEEKLY">Semanal (resumo semanal)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewAlert(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Criar Alerta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum alerta criado
            </h3>
            <p className="text-gray-600 mb-6">
              Crie alertas para ser notificado quando novos imóveis corresponderem às suas preferências
            </p>
            <button
              onClick={() => setShowNewAlert(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Criar Primeiro Alerta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{alert.name}</h3>
                      <p className="text-sm text-gray-500">
                        {getFrequencyLabel(alert.frequency)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  {alert.filters.city && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cidade:</span>
                      <span className="font-medium text-gray-900">{alert.filters.city}</span>
                    </div>
                  )}
                  {(alert.filters.minPrice || alert.filters.maxPrice) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Preço:</span>
                      <span className="font-medium text-gray-900">
                        {alert.filters.minPrice ? formatPrice(alert.filters.minPrice) : "R$ 0"} - 
                        {alert.filters.maxPrice ? formatPrice(alert.filters.maxPrice) : "∞"}
                      </span>
                    </div>
                  )}
                  {alert.filters.type && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-medium text-gray-900">{alert.filters.type}</span>
                    </div>
                  )}
                  {alert.filters.minBedrooms && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quartos:</span>
                      <span className="font-medium text-gray-900">{alert.filters.minBedrooms}+</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Criado em {new Date(alert.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
