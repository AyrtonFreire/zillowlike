"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  TrendingUp,
  Eye,
  MessageSquare,
  Heart,
  Home,
  Search,
  Filter,
  User,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { buildPropertyPath } from "@/lib/slug";

type RealtorRow = {
  id: string;
  name: string | null;
  email: string | null;
  publicSlug: string | null;
  publicCity: string | null;
  publicState: string | null;
  stats: {
    properties: number;
    views: number;
    leads: number;
    favorites: number;
    conversionRatePct: number;
  };
};

type PropertyRow = {
  id: string;
  title: string;
  price: number;
  status: string;
  purpose: string | null;
  city: string;
  state: string;
  neighborhood: string | null;
  createdAt: string;
  ownerId: string | null;
  owner: { id: string; name: string | null; email: string | null } | null;
  image: string | null;
  stats: {
    views: number;
    leads: number;
    favorites: number;
    conversionRatePct: number;
  };
};

type AnalyticsPayload = {
  success: boolean;
  period: string;
  realtorId: string | null;
  totals: {
    properties: number;
    views: number;
    leads: number;
    favorites: number;
    conversionRatePct: number;
  };
  realtors: RealtorRow[];
  properties: PropertyRow[];
  error?: string;
};

function formatNumber(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Number.isFinite(n) ? n : 0);
}

function formatPct(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toFixed(1)}%`;
}

function formatMoneyBRL(cents: number) {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<string>("30d");
  const [realtorId, setRealtorId] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("period", period);
        if (realtorId) params.set("realtorId", realtorId);
        params.set("t", String(Date.now()));

        const res = await fetch(`/api/admin/analytics?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await res.json()) as AnalyticsPayload;
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) {
          setData({
            success: false,
            period,
            realtorId: realtorId || null,
            totals: {
              properties: 0,
              views: 0,
              leads: 0,
              favorites: 0,
              conversionRatePct: 0,
            },
            realtors: [],
            properties: [],
            error: "Falha ao carregar analytics",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period, realtorId]);

  const properties = useMemo(() => {
    const list = data?.properties || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;

    return list.filter((p) => {
      const hay = [
        p.title,
        p.city,
        p.state,
        p.neighborhood || "",
        p.owner?.name || "",
        p.owner?.email || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data?.properties, query]);

  const periodLabel = useMemo(() => {
    const map: Record<string, string> = {
      "7d": "7 dias",
      "30d": "30 dias",
      "90d": "90 dias",
      all: "Todo período",
    };
    return map[period] || "30 dias";
  }, [period]);

  return (
    <DashboardLayout
      title="Analytics"
      description="Performance por corretor e anúncios"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Analytics" },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {["7d", "30d", "90d", "all"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${
                  period === p
                    ? "glass-teal text-white border-transparent"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : p === "90d" ? "90 dias" : "Todo período"}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por anúncio, cidade, corretor..."
                className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm w-full sm:w-[320px] outline-none focus:ring-2 focus:ring-teal-200"
              />
            </div>

            <div className="relative">
              <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={realtorId}
                onChange={(e) => setRealtorId(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-teal-200 w-full sm:w-[280px]"
              >
                <option value="">Todos os corretores</option>
                {(data?.realtors || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.name || "Sem nome").trim()} — {r.stats.properties} anúncios
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-12 h-12 border-4 border-teal-700 border-t-transparent rounded-full" />
          </div>
        ) : !data?.success ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-gray-900 font-semibold mb-1">Não foi possível carregar</div>
            <div className="text-gray-600 text-sm">{data?.error || "Tente novamente."}</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Anúncios</div>
                  <Home className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(data.totals.properties)}</div>
                <div className="text-xs text-gray-500 mt-1">Período: {periodLabel}</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visualizações</div>
                  <Eye className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(data.totals.views)}</div>
                <div className="text-xs text-gray-500 mt-1">Total no período</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Leads</div>
                  <MessageSquare className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(data.totals.leads)}</div>
                <div className="text-xs text-gray-500 mt-1">Total no período</div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversão</div>
                  <TrendingUp className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{formatPct(data.totals.conversionRatePct)}</div>
                <div className="text-xs text-gray-500 mt-1">Leads / Views</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Corretores</div>
                  <div className="text-xs text-gray-500">Clique para filtrar</div>
                </div>
                <div className="text-xs text-gray-500">{formatNumber((data.realtors || []).length)} corretores</div>
              </div>
              <div className="p-4 overflow-x-auto">
                <div className="flex gap-3 min-w-max">
                  <button
                    type="button"
                    onClick={() => setRealtorId("")}
                    className={`px-4 py-3 rounded-xl border transition-colors text-left min-w-[220px] ${
                      realtorId === "" ? "glass-teal text-white border-transparent" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className={`text-xs font-semibold ${realtorId === "" ? "text-white/90" : "text-gray-500"}`}>Todos</div>
                    <div className={`text-sm font-bold ${realtorId === "" ? "text-white" : "text-gray-900"}`}>Visão geral</div>
                    <div className={`text-xs mt-1 ${realtorId === "" ? "text-white/80" : "text-gray-500"}`}>
                      {formatNumber(data.totals.properties)} anúncios
                    </div>
                  </button>

                  {(data.realtors || []).map((r) => {
                    const active = realtorId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRealtorId(r.id)}
                        className={`px-4 py-3 rounded-xl border transition-colors text-left min-w-[260px] ${
                          active ? "glass-teal text-white border-transparent" : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className={`text-sm font-bold truncate ${active ? "text-white" : "text-gray-900"}`}>
                              {r.name || "Sem nome"}
                            </div>
                            <div className={`text-xs truncate ${active ? "text-white/80" : "text-gray-500"}`}>
                              {r.email || "—"}
                            </div>
                          </div>
                          <User className={`w-4 h-4 flex-shrink-0 ${active ? "text-white/80" : "text-gray-400"}`} />
                        </div>

                        <div className={`mt-2 text-xs ${active ? "text-white/80" : "text-gray-600"}`}>
                          {formatNumber(r.stats.properties)} anúncios · {formatNumber(r.stats.views)} views · {formatNumber(r.stats.leads)} leads
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${active ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700"}`}>
                            Conversão: {formatPct(r.stats.conversionRatePct)}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${active ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700"}`}>
                            <Heart className="w-3 h-3 mr-1" /> {formatNumber(r.stats.favorites)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Anúncios</div>
                <div className="text-xs text-gray-500">{formatNumber(properties.length)} resultados</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p) => {
                const href = buildPropertyPath(p.id, p.title);
                const subtitle = [p.neighborhood, `${p.city}, ${p.state}`].filter(Boolean).join(" · ");

                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="relative h-44 bg-gray-100">
                      {p.image ? (
                        <Image src={p.image} alt={p.title} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                          Sem imagem
                        </div>
                      )}

                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full glass-teal text-white text-[11px] font-semibold">
                          {formatPct(p.stats.conversionRatePct)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/90 text-gray-800 text-[11px] font-semibold border border-white/60">
                          {p.purpose === "RENT" ? "Alugar" : "Comprar"}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/90 text-gray-800 text-[11px] font-semibold border border-white/60">
                          {p.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 leading-snug line-clamp-2">{p.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{subtitle}</div>
                          <div className="text-sm font-semibold text-gray-900 mt-1">{formatMoneyBRL(p.price)}</div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Views</div>
                          <div className="text-lg font-bold text-gray-900 mt-1">{formatNumber(p.stats.views)}</div>
                        </div>
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Leads</div>
                          <div className="text-lg font-bold text-gray-900 mt-1">{formatNumber(p.stats.leads)}</div>
                        </div>
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fav</div>
                          <div className="text-lg font-bold text-gray-900 mt-1">{formatNumber(p.stats.favorites)}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-xs text-gray-500 min-w-0 truncate">
                          Corretor: {p.owner?.name || p.owner?.email || "—"}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link
                            href={href}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                          >
                            Ver anúncio
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
