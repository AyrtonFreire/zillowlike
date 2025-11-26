"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  Shuffle,
  CheckCircle,
  Ban,
  Eye,
  RefreshCw,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface LeadDetailProperty {
  id: string;
  title: string;
  price: number;
  type: string;
  city: string;
  state: string;
  neighborhood?: string | null;
  street: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaM2?: number | null;
  teamId?: string | null;
  ownerId?: string | null;
  images?: { url: string }[];
}

interface LeadDetailContact {
  name: string;
  email: string;
  phone?: string | null;
}

interface LeadDetailUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface LeadDetailRealtor {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

type LeadStatus =
  | "PENDING"
  | "MATCHING"
  | "WAITING_REALTOR_ACCEPT"
  | "WAITING_OWNER_APPROVAL"
  | "CONFIRMED"
  | "OWNER_REJECTED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED"
  | "ACCEPTED"
  | "REJECTED"
  | "RESERVED"
  | "AVAILABLE";

type PipelineStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

type LostReason =
  | "CLIENT_DESISTIU"
  | "FECHOU_OUTRO_IMOVEL"
  | "CONDICAO_FINANCEIRA"
  | "NAO_RESPONDEU"
  | "OUTRO";

interface LeadDetail {
  id: string;
  status: LeadStatus;
  pipelineStage?: PipelineStage;
  lostReason?: LostReason | null;
  isDirect: boolean;
  createdAt: string;
  respondedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  reservedUntil?: string | null;
  property: LeadDetailProperty;
  contact?: LeadDetailContact | null;
  user?: LeadDetailUser | null;
  realtor?: LeadDetailRealtor | null;
}

interface RealtorOption {
  realtorId: string;
  realtor: {
    name: string | null;
    email: string | null;
  };
}

interface LeadResponse {
  success: boolean;
  error?: string;
  lead: LeadDetail;
}

export default function AdminLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [realtors, setRealtors] = useState<RealtorOption[]>([]);

  const [reassignRealtorId, setReassignRealtorId] = useState<string>("");
  const [reassignSaving, setReassignSaving] = useState(false);

  const [statusDraft, setStatusDraft] = useState<LeadStatus | "">("");
  const [statusSaving, setStatusSaving] = useState(false);

  const [blockSaving, setBlockSaving] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    fetchLead();
    fetchRealtors();
  }, [leadId]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/leads/${leadId}`);
      const data: LeadResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não conseguimos carregar este lead agora.");
      }

      setLead(data.lead);
      setStatusDraft(data.lead.status);
      if (data.lead.realtor?.id) {
        setReassignRealtorId(data.lead.realtor.id);
      }
    } catch (err: any) {
      setError(err?.message || "Não conseguimos carregar este lead agora.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtors = async () => {
    try {
      const res = await fetch("/api/admin/realtor-queues");
      const data = await res.json();
      if (res.ok && data?.success && Array.isArray(data.queues)) {
        setRealtors(data.queues as RealtorOption[]);
      }
    } catch (err) {
      console.error("Error fetching admin realtor queues:", err);
    }
  };

  const handleReassign = async () => {
    if (!reassignRealtorId) return;
    try {
      setReassignSaving(true);
      const res = await fetch(`/api/leads/${leadId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtorId: reassignRealtorId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        alert(data?.error || "Não conseguimos reatribuir este lead agora.");
        return;
      }
      await fetchLead();
      alert("Lead reatribuído com sucesso.");
    } catch (err) {
      console.error("Error reassigning lead from admin panel:", err);
      alert("Erro ao reatribuir lead.");
    } finally {
      setReassignSaving(false);
    }
  };

  const handleForceStatus = async () => {
    if (!statusDraft) return;
    try {
      setStatusSaving(true);
      const res = await fetch(`/api/admin/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDraft }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        alert(data?.error || "Não conseguimos atualizar o status deste lead agora.");
        return;
      }
      await fetchLead();
      alert("Status do lead atualizado.");
    } catch (err) {
      console.error("Error forcing lead status from admin panel:", err);
      alert("Erro ao atualizar status do lead.");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleToggleMural = async () => {
    if (!lead) return;
    try {
      setBlockSaving(true);
      const block = !lead.isDirect;
      const res = await fetch(`/api/admin/leads/${leadId}/mural`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        alert(data?.error || "Não conseguimos atualizar a visibilidade deste lead no mural.");
        return;
      }
      setLead((prev) => (prev ? { ...prev, isDirect: data.lead.isDirect } : prev));
    } catch (err) {
      console.error("Error toggling lead mural visibility from admin panel:", err);
      alert("Erro ao atualizar visibilidade do lead no mural.");
    } finally {
      setBlockSaving(false);
    }
  };

  const getStatusLabel = (status: LeadStatus) => {
    const map: Record<LeadStatus, string> = {
      PENDING: "Pendente (aguardando candidaturas)",
      MATCHING: "Buscando corretor",
      WAITING_REALTOR_ACCEPT: "Aguardando corretor prioritário",
      WAITING_OWNER_APPROVAL: "Aguardando proprietário",
      CONFIRMED: "Visita confirmada",
      OWNER_REJECTED: "Recusado pelo proprietário",
      CANCELLED: "Cancelado pelo cliente",
      COMPLETED: "Concluído",
      EXPIRED: "Expirado",
      ACCEPTED: "Aceito (legado)",
      REJECTED: "Rejeitado (legado)",
      RESERVED: "Reservado (legado)",
      AVAILABLE: "Disponível (legado)",
    };
    return map[status] || status;
  };

  const getPipelineLabel = (stage?: PipelineStage) => {
    if (!stage) return "Sem funil definido";
    const map: Record<PipelineStage, string> = {
      NEW: "Novo",
      CONTACT: "Contato",
      VISIT: "Visita",
      PROPOSAL: "Proposta",
      DOCUMENTS: "Documentos",
      WON: "Ganho",
      LOST: "Perdido",
    };
    return map[stage] || stage;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("pt-BR");
  };

  if (loading) {
    return (
      <DashboardLayout
        title="Lead (admin)"
        description="Carregando detalhes do lead..."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Leads", href: "/admin/leads" },
          { label: "Detalhes" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm">Carregando dados do lead...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !lead) {
    return (
      <DashboardLayout
        title="Lead (admin)"
        description="Erro ao carregar"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Leads", href: "/admin/leads" },
          { label: "Detalhes" },
        ]}
      >
        <div className="max-w-3xl mx-auto py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-red-800 mb-1">Não conseguimos carregar este lead</h2>
                <p className="text-sm text-red-700 mb-4">{error || "Tente novamente em alguns instantes."}</p>
                <button
                  type="button"
                  onClick={fetchLead}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const statusLabel = getStatusLabel(lead.status);
  const pipelineLabel = getPipelineLabel(lead.pipelineStage);

  return (
    <DashboardLayout
      title="Lead (admin)"
      description={lead.property.title}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Leads", href: "/admin/leads" },
        { label: "Detalhes" },
      ]}
      actions={
        <button
          type="button"
          onClick={() => router.push("/admin/leads")}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para mural
        </button>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Lead do imóvel</h1>
                <p className="text-sm text-gray-600 mb-2">
                  {lead.property.street}
                  {lead.property.neighborhood ? `, ${lead.property.neighborhood}` : ""} · {lead.property.city} - {lead.property.state}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    <MapPin className="w-3 h-3" />
                    {lead.property.city}/{lead.property.state}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {statusLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {pipelineLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-gray-600 border-gray-200">
                    {lead.isDirect ? "Lead direto (fora do mural)" : "Participa do mural"}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-600 min-w-[200px]">
                <p className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>
                    Criado em {formatDateTime(lead.createdAt)}
                  </span>
                </p>
                {lead.respondedAt && (
                  <p className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>Primeira resposta em {formatDateTime(lead.respondedAt)}</span>
                  </p>
                )}
                {lead.completedAt && (
                  <p className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>Concluído em {formatDateTime(lead.completedAt)}</span>
                  </p>
                )}
                {lead.cancelledAt && (
                  <p className="flex items-center gap-2">
                    <Ban className="w-3 h-3 text-red-600" />
                    <span>Cancelado em {formatDateTime(lead.cancelledAt)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-xl p-4 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Dados do cliente</h2>
                {lead.contact ? (
                  <div className="space-y-2 text-sm text-gray-700">
                    <p className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span>{lead.contact.name}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{lead.contact.email}</span>
                    </p>
                    {lead.contact.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{lead.contact.phone}</span>
                      </p>
                    )}
                    {lead.user && (
                      <p className="mt-2 text-xs text-gray-500">
                        Usuário cadastrado: {lead.user.name || lead.user.email}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Este lead ainda não tem um contato estruturado vinculado.</p>
                )}
              </div>

              <div className="border rounded-xl p-4 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Responsáveis</h2>
                <div className="space-y-3 text-sm text-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Corretor responsável</p>
                    {lead.realtor ? (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{lead.realtor.name || "Sem nome"}</p>
                          <p className="text-xs text-gray-500">{lead.realtor.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/broker/dashboard?previewUserId=${lead.realtor.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-300 text-[11px] text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="w-3 h-3" />
                            Ver como corretor
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Nenhum corretor atribuído.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Proprietário do imóvel</p>
                    {lead.property.ownerId ? (
                      <Link
                        href={`/owner/dashboard?previewUserId=${lead.property.ownerId}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-300 text-[11px] text-gray-700 hover:bg-gray-50"
                      >
                        <UserIcon className="w-3 h-3" />
                        Abrir dashboard do proprietário
                      </Link>
                    ) : (
                      <p className="text-xs text-gray-500">Imóvel sem proprietário vinculado.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Ferramentas administrativas</h2>

              <div className="space-y-4 text-xs text-gray-700">
                <div className="border-b border-gray-100 pb-4">
                  <p className="font-semibold text-gray-900 mb-1">Reatribuir lead</p>
                  <p className="text-gray-500 mb-2">
                    Escolha outro corretor para assumir este atendimento. Use com moderação, priorizando times e contexto já combinado
                    com o cliente.
                  </p>
                  <div className="flex flex-col gap-2">
                    <select
                      value={reassignRealtorId}
                      onChange={(e) => setReassignRealtorId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione um corretor parceiro</option>
                      {realtors.map((item) => (
                        <option key={item.realtorId} value={item.realtorId}>
                          {item.realtor.name || item.realtor.email}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleReassign}
                      disabled={!reassignRealtorId || reassignSaving}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold bg-gray-900 text-white hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Shuffle className="w-3 h-3" />
                      {reassignSaving ? "Reatribuindo..." : "Reatribuir lead"}
                    </button>
                  </div>
                </div>

                <div className="border-b border-gray-100 pb-4">
                  <p className="font-semibold text-gray-900 mb-1">Forçar status do lead</p>
                  <p className="text-gray-500 mb-2">
                    Ajuste manualmente o status técnico do lead (fila/mural) em casos de correção pontual. Não use para penalizar
                    corretores.
                  </p>
                  <div className="flex flex-col gap-2">
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value as LeadStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione um status</option>
                      <option value="PENDING">Pendente</option>
                      <option value="MATCHING">Buscando corretor (matching)</option>
                      <option value="WAITING_REALTOR_ACCEPT">Aguardando corretor prioritário</option>
                      <option value="WAITING_OWNER_APPROVAL">Aguardando proprietário</option>
                      <option value="CONFIRMED">Confirmado</option>
                      <option value="CANCELLED">Cancelado</option>
                      <option value="COMPLETED">Concluído</option>
                      <option value="EXPIRED">Expirado</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleForceStatus}
                      disabled={!statusDraft || statusSaving}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-3 h-3" />
                      {statusSaving ? "Aplicando..." : "Aplicar status"}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">Controle de participação no mural</p>
                  <p className="text-gray-500 mb-3">
                    Use este controle apenas quando for necessário remover ou permitir este lead no mural de corretores, sem mexer em
                    pontos ou penalidades.
                  </p>
                  <button
                    type="button"
                    onClick={handleToggleMural}
                    disabled={blockSaving}
                    className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold border ${
                      lead.isDirect
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {lead.isDirect ? <Eye className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                    {blockSaving
                      ? "Salvando..."
                      : lead.isDirect
                      ? "Permitir novamente no mural"
                      : "Bloquear lead do mural"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 text-xs text-gray-600">
              <p className="font-semibold text-gray-900 mb-1">Observação</p>
              <p>
                Estas ferramentas são pensadas para correções pontuais e suporte ao time. Sempre que possível, deixe que a própria
                fila e o funil façam o trabalho automático, mantendo o sistema leve e sem pressão para corretores.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>
    </DashboardLayout>
  );
}
