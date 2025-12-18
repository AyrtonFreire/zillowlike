"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Mail,
  Phone,
  Home,
  Calendar,
  Filter,
  Search,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { buildPropertyPath } from "@/lib/slug";

interface Lead {
  id: string;
  message: string;
  createdAt: string;
  status: string;
  contact: {
    name: string;
    email: string;
    phone: string | null;
  };
  property: {
    id: string;
    title: string;
    city: string;
    state: string;
  };
}

export default function OwnerLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      fetchLeads();
    }
  }, [status, router]);

  const fetchLeads = async () => {
    try {
      setError(null);
      const response = await fetch("/api/leads/my-leads");
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (error) {
      console.error("Error:", error);
      setError('Não conseguimos carregar seus leads agora. Se quiser, tente novamente em alguns instantes.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setLeads(prev =>
          prev.map(lead =>
            lead.id === leadId ? { ...lead, status: newStatus } : lead
          )
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesFilter = filter === "ALL" || lead.status === filter;
    const matchesSearch = search === "" ||
      lead.contact.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.property.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      NEW: { label: "Novo", color: "glass-teal text-blue-800", icon: Clock },
      CONTACTED: { label: "Contatado", color: "glass-teal text-yellow-800", icon: MessageSquare },
      QUALIFIED: { label: "Qualificado", color: "glass-teal text-green-800", icon: CheckCircle },
      CLOSED: { label: "Fechado", color: "glass-teal text-gray-800", icon: XCircle },
    };
    const { label, color, icon: Icon } = config[status as keyof typeof config] || config.NEW;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Meus Leads"
        description="Gerenciar interessados"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Proprietário", href: "/owner/dashboard" },
          { label: "Leads" },
        ]}
      >
        <CenteredSpinner message="Carregando seus leads..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Meus Leads"
      description={`${leads.length} interessados no total`}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Proprietário", href: "/owner/dashboard" },
        { label: "Leads" },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Total</span>
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{leads.length}</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Novos</span>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {leads.filter(l => l.status === "NEW").length}
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Qualificados</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {leads.filter(l => l.status === "QUALIFIED").length}
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Fechados</span>
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {leads.filter(l => l.status === "CLOSED").length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou imóvel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                { value: "ALL", label: "Todos" },
                { value: "NEW", label: "Novos" },
                { value: "CONTACTED", label: "Contatados" },
                { value: "QUALIFIED", label: "Qualificados" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === item.value
                      ? "glass-teal text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leads List */}
        {error ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <EmptyState
              icon={<MessageSquare className="w-16 h-16 text-gray-300" />} 
              title="Não foi possível carregar seus leads"
              description={error}
              action={
                <button
                  onClick={fetchLeads}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
                >
                  Tentar novamente
                </button>
              }
            />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <EmptyState
              icon={<MessageSquare className="w-16 h-16 text-gray-300" />}
              title="Nenhum lead encontrado"
              description={
                search || filter !== "ALL"
                  ? "Tente ajustar os filtros ou limpar a busca para ver outros interessados."
                  : "Assim que alguém demonstrar interesse nos seus imóveis, ele aparece aqui para você acompanhar com calma."
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {lead.contact.name}
                      </h3>
                      {getStatusBadge(lead.status)}
                    </div>
                    <Link
                      href={buildPropertyPath(lead.property.id, lead.property.title)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-2"
                    >
                      <Home className="w-4 h-4" />
                      {lead.property.title}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(lead.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {lead.message}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <a
                      href={`mailto:${lead.contact.email}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      {lead.contact.email}
                    </a>
                    {lead.contact.phone && (
                      <a
                        href={`tel:${lead.contact.phone}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        {lead.contact.phone}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="NEW">Novo</option>
                      <option value="CONTACTED">Contatado</option>
                      <option value="QUALIFIED">Qualificado</option>
                      <option value="CLOSED">Fechado</option>
                    </select>

                    <Link
                      href={`/owner/leads/${lead.id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Conversar com o corretor
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
