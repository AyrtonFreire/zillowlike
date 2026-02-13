"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, MapPin, RefreshCcw, Search } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { formatPublicCode } from "@/lib/public-code";

interface OwnerLeadListItem {
  id: string;
  publicCode?: string | null;
  status: string;
  createdAt: string;
  pipelineStage?: string | null;
  hasUnreadMessages?: boolean;
  lastMessageAt?: string | null;
  property: {
    id: string;
    publicCode?: string | null;
    title: string;
    price?: number;
    city: string;
    state: string;
    neighborhood?: string | null;
    images: Array<{ url: string }>;
  };
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

const currencyBRL = (value: number) => {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(Number(value || 0)));
  } catch {
    return String(value || 0);
  }
};

const formatShortDate = (value: string) => {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
  } catch {
    return "";
  }
};

const stageLabel = (stage?: string | null) => {
  const s = String(stage || "").toUpperCase();
  if (!s) return "Novo";
  if (s === "NEW") return "Novo";
  if (s === "CONTACT") return "Em contato";
  if (s === "VISIT") return "Negociação";
  if (s === "PROPOSAL") return "Proposta";
  if (s === "DOCUMENTS") return "Documentos";
  if (s === "WON" || s === "LOST") return "Fechado";
  return s;
};

export default function OwnerLeadsPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<OwnerLeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const propertyIdFilter = searchParams.get("propertyId");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  const fetchLeads = async (opts?: { silent?: boolean }) => {
    try {
      setError(null);
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);

      const response = await fetch("/api/owner/leads");
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Não conseguimos carregar seus leads agora.");
      }

      setLeads(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching owner leads:", err);
      setError(err?.message || "Não conseguimos carregar seus leads agora.");
      setLeads([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (propertyIdFilter && lead.property?.id !== propertyIdFilter) return false;
      if (!q) return true;
      const title = String(lead.property?.title || "").toLowerCase();
      const contact = String(lead.contact?.name || lead.contact?.email || "").toLowerCase();
      const city = String(lead.property?.city || "").toLowerCase();
      const id = String(lead.id || "").toLowerCase();
      const leadCode = lead.publicCode ? formatPublicCode(String(lead.publicCode)).toLowerCase() : "";
      const propCode = lead.property?.publicCode ? formatPublicCode(String(lead.property.publicCode)).toLowerCase() : "";
      return title.includes(q) || contact.includes(q) || city.includes(q) || id.includes(q) || leadCode.includes(q) || propCode.includes(q);
    });
  }, [leads, query, propertyIdFilter]);

  if (loading) {
    return <CenteredSpinner message="Carregando seus leads..." />;
  }

  return (
    <DashboardLayout
      title="Meus leads"
      description="Acompanhe interessados e conversas dos seus anúncios."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Proprietário", href: "/owner/dashboard" },
        { label: "Meus leads" },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por imóvel, cidade ou contato..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchLeads({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10">
            <EmptyState
              title="Nenhum lead por aqui"
              description="Quando alguém demonstrar interesse em um anúncio, a conversa aparece nesta lista."
              action={
                <Link
                  href="/owner/properties"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold"
                >
                  Ver meus anúncios
                </Link>
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((lead) => {
              const img = lead.property?.images?.[0]?.url || "/placeholder.jpg";
              const contactName = lead.contact?.name || lead.contact?.email || "Contato";
              const leadCode = lead.publicCode ? formatPublicCode(String(lead.publicCode)) : "";
              const displayId = leadCode || (lead.id.length <= 8 ? lead.id : lead.id.slice(-8));
              const copyId = leadCode || lead.id;
              return (
                <Link
                  key={lead.id}
                  href={`/owner/leads/${lead.id}`}
                  className="block rounded-2xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                      <Image src={img} alt={lead.property.title} fill className="object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2">{lead.property.title}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                void navigator.clipboard.writeText(String(copyId));
                              } catch {
                              }
                            }}
                            className="mt-1 inline-flex items-center text-[11px] font-semibold text-gray-500 hover:text-gray-800"
                            title={copyId}
                          >
                            ID {displayId}
                          </button>
                          <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">
                              {lead.property.neighborhood && `${lead.property.neighborhood}, `}
                              {lead.property.city} - {lead.property.state}
                            </span>
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          {typeof lead.property.price === "number" && (
                            <p className="text-[11px] font-semibold text-gray-900 tabular-nums">{currencyBRL(lead.property.price / 100)}</p>
                          )}
                          <p className="mt-1 text-[11px] text-gray-500">{formatShortDate(lead.createdAt)}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-semibold text-gray-700">
                          {stageLabel(lead.pipelineStage)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700">
                          {contactName}
                        </span>
                        {lead.hasUnreadMessages && (
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                            Nova mensagem
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-1 text-gray-500 flex-shrink-0">
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                        <MessageCircle className="w-4 h-4" />
                        Chat
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
