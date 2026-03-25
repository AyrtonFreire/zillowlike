"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell, Plus, Trash2, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { ptBR } from "@/lib/i18n/property";

interface Alert {
  id: string;
  name: string;
  filters: any;
  params?: string;
  frequency: string;
  alertsEnabled?: boolean;
  lastAlertSentAt?: string | null;
  createdAt: string;
}

export default function AlertsPage() {
  const { status } = useSession();
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
  const [inCondominium, setInCondominium] = useState(false);
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
          minPrice: minPrice ? parseInt(minPrice) : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
          propertyType: propertyType || undefined,
          inCondominium: inCondominium || undefined,
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
        setInCondominium(false);
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

  const formatPrice = (reais: number | string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(Number(reais || 0));
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
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
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
          className="inline-flex items-center gap-2 rounded-2xl glass-teal px-5 py-3 text-sm font-semibold text-white"
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
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200/80 bg-white p-6 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Criar Novo Alerta</h2>
                <button
                  onClick={() => setShowNewAlert(false)}
                  className="rounded-xl p-2 transition-colors hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
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
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-teal-500/20"
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
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-teal-500/20"
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
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={inCondominium}
                      onChange={(e) => setInCondominium(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    Em condomínio
                  </label>
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
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-teal-500/20"
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
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-teal-500/20"
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
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="">Todos</option>
                      <option value="HOUSE">Casa</option>
                      <option value="APARTMENT">Apartamento</option>
                      <option value="TOWNHOUSE">Sobrado</option>
                      <option value="STUDIO">Studio</option>
                      <option value="LAND">Terreno</option>
                      <option value="RURAL">Imóvel rural</option>
                      <option value="COMMERCIAL">Comercial</option>
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
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-teal-500/20"
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
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-teal-500/20"
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
                    className="flex-1 rounded-2xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl glass-teal px-6 py-3 text-sm font-semibold text-white"
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
          <div className="rounded-3xl border border-gray-200/90 bg-white p-12 text-center shadow-sm shadow-black/5">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhum alerta criado
            </h3>
            <p className="text-gray-600 mb-6">
              Crie alertas para ser notificado quando novos imóveis corresponderem às suas preferências
            </p>
            <button
              onClick={() => setShowNewAlert(true)}
              className="inline-flex items-center gap-2 rounded-2xl glass-teal px-6 py-3 text-sm font-semibold text-white"
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
                className="rounded-3xl border border-gray-200/90 bg-white p-6 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-teal-50 p-2.5">
                      <Bell className="w-5 h-5 text-teal-600" />
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
                    className="rounded-xl p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
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
                      <span className="font-medium text-gray-900">{ptBR.type(alert.filters.type)}</span>
                    </div>
                  )}
                  {alert.filters.inCondominium && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Em condomínio:</span>
                      <span className="font-medium text-gray-900">Sim</span>
                    </div>
                  )}
                  {(alert.filters.bedroomsMin || alert.filters.minBedrooms) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quartos:</span>
                      <span className="font-medium text-gray-900">{alert.filters.bedroomsMin || alert.filters.minBedrooms}+</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-500 mb-1">
                    Status: {alert.alertsEnabled === false ? "pausado" : "ativo"}
                  </p>
                  {alert.lastAlertSentAt && (
                    <p className="text-xs text-gray-500 mb-1">
                      Último envio em {new Date(alert.lastAlertSentAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
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
