"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  views14d?: number;
  leads14d?: number;
  conversion14dPct?: number | null;
};

type InsightFilter = "noViews14d" | "noLeads14d" | "lowConversion14d" | null;

type ApiResponse = {
  success: boolean;
  team: { id: string; name: string } | null;
  properties: AgencyProperty[];
  error?: string;
};

export default function AgencyPropertiesPage() {
  const { status } = useSession();

  const searchParams = useSearchParams();
  const insightParam = searchParams.get("insight");
  const insightFilter = useMemo((): InsightFilter => {
    const v = String(insightParam || "").trim();
    if (v === "noViews14d" || v === "noLeads14d" || v === "lowConversion14d") return v;
    return null;
  }, [insightParam]);

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
    const base = properties.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (typeFilter && String(p.type) !== String(typeFilter)) return false;
      if (!q) return true;

      const haystack = [p.id, p.title, p.street, p.neighborhood, p.city, p.state, p.type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

    const byInsight = (() => {
      if (!insightFilter) return base;

      if (insightFilter === "noViews14d") {
        return base.filter((p) => p.status === "ACTIVE" && Number(p.views14d || 0) === 0);
      }
      if (insightFilter === "noLeads14d") {
        return base.filter((p) => p.status === "ACTIVE" && Number(p.views14d || 0) >= 50 && Number(p.leads14d || 0) === 0);
      }
      if (insightFilter === "lowConversion14d") {
        return base.filter((p) => {
          if (p.status !== "ACTIVE") return false;
          const views14d = Number(p.views14d || 0);
          const leads14d = Number(p.leads14d || 0);
          if (views14d < 200) return false;
          if (leads14d <= 0) return false;
          const conversion = leads14d / views14d;
          return conversion > 0 && conversion < 0.005;
        });
      }
      return base;
    })();

    const sortPerf = (arr: AgencyProperty[]) => {
      if (!insightFilter) return arr;
      const copy = [...arr];
      if (insightFilter === "noViews14d") {
        return copy.sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
      }
      if (insightFilter === "noLeads14d") {
        return copy.sort((a, b) => Number(b.views14d || 0) - Number(a.views14d || 0));
      }
      if (insightFilter === "lowConversion14d") {
        return copy.sort((a, b) => {
          const aViews = Number(a.views14d || 0);
          const bViews = Number(b.views14d || 0);
          const aLeads = Number(a.leads14d || 0);
          const bLeads = Number(b.leads14d || 0);
          const aConv = aViews > 0 ? aLeads / aViews : 0;
          const bConv = bViews > 0 ? bLeads / bViews : 0;
          if (aConv !== bConv) return aConv - bConv;
          return bViews - aViews;
        });
      }
      return copy;
    };

    return sortPerf(byInsight);
  }, [properties, qDraft, statusFilter, typeFilter, insightFilter]);

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
                {insightFilter && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                      Filtro: {insightFilter}
                      <Link href="/agency/properties" className="text-[11px] font-bold text-blue-700 underline">
                        limpar
                      </Link>
                    </span>
                  </div>
                )}
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
                    badges={(() => {
                      const badges: Array<{ label: string; tone?: "info" | "warning" | "critical" }> = [];
                      const v14 = Number(p.views14d || 0);
                      const l14 = Number(p.leads14d || 0);
                      if (p.status === "ACTIVE" && v14 === 0) {
                        badges.push({ label: "Sem views 14d", tone: "warning" });
                      }
                      if (p.status === "ACTIVE" && v14 >= 50 && l14 === 0) {
                        badges.push({ label: "Views>50/0 leads", tone: "critical" });
                      }
                      if (p.status === "ACTIVE" && v14 >= 200 && l14 > 0) {
                        const conv = l14 / v14;
                        if (conv > 0 && conv < 0.005) {
                          badges.push({ label: "Conv <0,5%", tone: "warning" });
                        }
                      }
                      return badges;
                    })()}
                  />
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
