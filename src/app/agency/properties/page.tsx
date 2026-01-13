"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import PropertyCardV2 from "@/components/dashboard/PropertyCardV2";
import { X } from "lucide-react";

type PropertyStatus = "ACTIVE" | "PAUSED" | "DRAFT";

type AgencyProperty = {
  id: string;
  title: string;
  price: number;
  status: PropertyStatus;
  type: string;
  city: string;
  state: string;
  street: string;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  image: string | null;
  views: number;
  leads: number;
  favorites: number;
};

type ApiResponse = {
  success: boolean;
  team: { id: string; name: string } | null;
  properties: AgencyProperty[];
  error?: string;
};

export default function AgencyPropertiesPage() {
  const { status } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>("Imóveis");
  const [properties, setProperties] = useState<AgencyProperty[]>([]);

  const [qDraft, setQDraft] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    if (status !== "authenticated") return;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const r = await fetch("/api/agency/properties", { cache: "no-store" });
        const j = (await r.json().catch(() => null)) as ApiResponse | null;

        if (!r.ok || !j?.success) {
          throw new Error(j?.error || "Não conseguimos carregar os imóveis agora.");
        }

        setTeamName(j.team?.name ? `Imóveis — ${j.team.name}` : "Imóveis");
        setProperties(Array.isArray(j.properties) ? j.properties : []);
      } catch (e: any) {
        setError(e?.message || "Não conseguimos carregar os imóveis agora.");
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [status]);

  const title = useMemo(() => teamName, [teamName]);

  const types = useMemo(() => {
    const unique = new Set<string>();
    properties.forEach((p) => {
      if (p.type) unique.add(String(p.type));
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [properties]);

  const filteredProperties = useMemo(() => {
    const q = String(qDraft || "").trim().toLowerCase();
    return properties.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (typeFilter && String(p.type) !== String(typeFilter)) return false;
      if (!q) return true;

      const haystack = [p.id, p.title, p.street, p.neighborhood, p.city, p.state, p.type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [properties, qDraft, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    const total = filteredProperties.length;
    const active = filteredProperties.filter((p) => p.status === "ACTIVE").length;
    const paused = filteredProperties.filter((p) => p.status === "PAUSED").length;
    return { total, active, paused };
  }, [filteredProperties]);

  if (status === "loading" || loading) {
    return <CenteredSpinner message="Carregando imóveis..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Erro ao carregar imóveis"
        description={error}
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  return (
    <div className="py-2">
        {properties.length === 0 ? (
          <EmptyState
            title="Nenhum imóvel no time"
            description="Quando o time cadastrar imóveis, eles aparecerão aqui."
            action={
              <Link
                href="/owner/new"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
              >
                Cadastrar imóvel
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
                <div className="mt-1 text-xs text-gray-500">Imóveis vinculados ao time (visão da agência).</div>
              </div>
              <Link
                href="/owner/new"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
              >
                Cadastrar imóvel
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="text-[11px] font-semibold text-gray-500">Imóveis</div>
                <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{summary.total}</div>
                <div className="mt-1 text-xs text-gray-500">Na seleção atual</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="text-[11px] font-semibold text-gray-500">Ativos</div>
                <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{summary.active}</div>
                <div className="mt-1 text-xs text-gray-500">Disponíveis</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="text-[11px] font-semibold text-gray-500">Pausados</div>
                <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{summary.paused}</div>
                <div className="mt-1 text-xs text-gray-500">Revisar anúncios</div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar</label>
                  <div className="relative">
                    <input
                      value={qDraft}
                      onChange={(e) => setQDraft(String(e.target.value))}
                      placeholder="Título, bairro, cidade, rua..."
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                    />
                    {qDraft ? (
                      <button
                        type="button"
                        onClick={() => setQDraft("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                        aria-label="Limpar busca"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="w-full lg:w-56">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as PropertyStatus | "ALL")}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                  >
                    <option value="ALL">Todos</option>
                    <option value="ACTIVE">Ativos</option>
                    <option value="PAUSED">Pausados</option>
                    <option value="DRAFT">Rascunho</option>
                  </select>
                </div>

                <div className="w-full lg:w-56">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(String(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                  >
                    <option value="">Todos</option>
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setQDraft("");
                    setStatusFilter("ALL");
                    setTypeFilter("");
                  }}
                  disabled={!qDraft && statusFilter === "ALL" && !typeFilter}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Limpar
                </button>
              </div>
            </div>

            {filteredProperties.length === 0 ? (
              <EmptyState
                title="Nenhum imóvel encontrado"
                description="Ajuste os filtros para encontrar resultados."
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setQDraft("");
                      setStatusFilter("ALL");
                      setTypeFilter("");
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
                  >
                    Limpar filtros
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProperties.map((p) => (
                  <PropertyCardV2
                    key={p.id}
                    id={p.id}
                    href={`/property/${p.id}`}
                    title={p.title}
                    price={p.price}
                    status={p.status}
                    image={p.image}
                    street={p.street}
                    neighborhood={p.neighborhood}
                    city={p.city}
                    state={p.state}
                    bedrooms={p.bedrooms}
                    bathrooms={p.bathrooms}
                    areaM2={p.areaM2}
                    type={p.type}
                    views={p.views}
                    leads={p.leads}
                    favorites={p.favorites}
                  />
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
