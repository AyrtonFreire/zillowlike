"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Settings, Save, AlertTriangle } from "lucide-react";

type SettingsKey =
  | "leadReservationMinutes"
  | "maxActiveLeadsPerRealtor"
  | "enableRealtorBoard"
  | "enableAutoReassignExpired";

interface SystemSettingDto {
  key: string;
  value: string;
  description?: string | null;
}

const DEFAULTS: Record<SettingsKey, string> = {
  leadReservationMinutes: "10",
  maxActiveLeadsPerRealtor: "3",
  enableRealtorBoard: "true",
  enableAutoReassignExpired: "true",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<SettingsKey, string>>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/settings");
        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Não conseguimos carregar as configurações agora.");
        }

        const map: Record<SettingsKey, string> = { ...DEFAULTS };
        const list: SystemSettingDto[] = Array.isArray(data.settings) ? data.settings : [];

        for (const item of list) {
          if ((Object.keys(DEFAULTS) as SettingsKey[]).includes(item.key as SettingsKey)) {
            map[item.key as SettingsKey] = item.value ?? "";
          }
        }

        setSettings(map);
      } catch (err: any) {
        console.error("Error fetching admin system settings:", err);
        setError(err?.message || "Não conseguimos carregar as configurações agora.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (key: SettingsKey, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key: Extract<SettingsKey, "enableRealtorBoard" | "enableAutoReassignExpired">) => {
    setSettings((prev) => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      setError(null);

      const entries = Object.entries(settings) as [SettingsKey, string][];

      const responses = await Promise.all(
        entries.map(async ([key, value]) => {
          const res = await fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.success) {
            throw new Error(data?.error || `Erro ao salvar configuração ${key}`);
          }
          return data;
        }),
      );

      if (responses.length > 0) {
        setSaveMessage("Configurações salvas com sucesso.");
      }
    } catch (err: any) {
      console.error("Error saving admin system settings:", err);
      setError(err?.message || "Não conseguimos salvar as configurações agora.");
    } finally {
      setSaving(false);
    }
  };

  const parsedLeadReservation = Number.parseInt(settings.leadReservationMinutes, 10) || 0;
  const parsedMaxActiveLeads = Number.parseInt(settings.maxActiveLeadsPerRealtor, 10) || 0;
  const enableBoard = settings.enableRealtorBoard === "true";
  const autoReassign = settings.enableAutoReassignExpired === "true";

  return (
    <DashboardLayout
      title="Configurações do sistema"
      description="Ajustes globais que afetam como a fila, o mural e os leads funcionam."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Configurações" },
      ]}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Não conseguimos carregar ou salvar as configurações</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {saveMessage && !error && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {saveMessage}
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gray-900 text-white">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Parâmetros globais</h1>
            <p className="text-sm text-gray-600">
              Use estes controles para calibrar o comportamento geral do sistema sem precisar mexer em código.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-600">Carregando configurações...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">Fila e reservas de leads</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Ajustes que controlam quanto tempo um corretor prioritário fica com um lead reservado e quantos leads simultâneos
                  pode atender, sem criar pressão excessiva.
                </p>

                <div className="space-y-4 text-sm text-gray-700">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tempo de reserva para corretor prioritário (minutos)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={settings.leadReservationMinutes}
                      onChange={(e) => handleChange("leadReservationMinutes", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Hoje o código usa um valor fixo de 10 minutos. No próximo passo, podemos plugar este parâmetro para controlar
                      isso sem deploy.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Limite recomendado de leads simultâneos por corretor
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={settings.maxActiveLeadsPerRealtor}
                      onChange={(e) => handleChange("maxActiveLeadsPerRealtor", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Este número pode ser usado em futuras regras de distribuição/alertas para evitar sobrecarga de corretores.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-1">Mural e reaproveitamento de leads</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Controles que determinam quando o mural está ativo e como leads expirados podem voltar para novos corretores.
                </p>

                <div className="space-y-4 text-sm text-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-0.5">Ativar mural de corretores</p>
                      <p className="text-xs text-gray-500">
                        Quando desligado, novos leads não vão para o mural público. Eles continuam funcionando para donos de
                        imóveis e fluxos diretos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle("enableRealtorBoard")}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        enableBoard
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {enableBoard ? "Ligado" : "Desligado"}
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-0.5">Repassar automaticamente leads expirados</p>
                      <p className="text-xs text-gray-500">
                        Quando ligado, o sistema tenta mover leads reservados que expiraram para o próximo candidato ou de volta
                        ao mural, sem intervenção manual.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle("enableAutoReassignExpired")}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        autoReassign
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {autoReassign ? "Ligado" : "Desligado"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-gray-500">
                <p>
                  Estas configurações são pensadas para dar flexibilidade operacional sem transformar o sistema em algo punitivo.
                  Mudanças aqui afetam todos os corretores e leads.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
