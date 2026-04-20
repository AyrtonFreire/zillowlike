"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Calendar,
  DoorOpen,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Save,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import LeadTimeline from "@/components/crm/LeadTimeline";
import { formatPublicCode } from "@/lib/public-code";

type DeveloperLeadDetail = {
  id: string;
  publicCode?: string | null;
  status: string;
  pipelineStage?: string | null;
  createdAt: string;
  respondedAt?: string | null;
  completedAt?: string | null;
  visitDate?: string | null;
  visitTime?: string | null;
  clientNotes?: string | null;
  message?: string | null;
  property: {
    id: string;
    publicCode?: string | null;
    title: string;
    price?: number | null;
    type?: string | null;
    city: string;
    state: string;
    neighborhood?: string | null;
    street?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaM2?: number | null;
    builtAreaM2?: number | null;
    usableAreaM2?: number | null;
    lotAreaM2?: number | null;
    privateAreaM2?: number | null;
    suites?: number | null;
    parkingSpots?: number | null;
    floor?: number | null;
    furnished?: boolean | null;
    petFriendly?: boolean | null;
    condoFee?: number | null;
    purpose?: "SALE" | "RENT" | null;
    images?: Array<{ url: string }>;
  } | null;
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  developmentProject?: {
    id: string;
    name: string;
    status: string;
  } | null;
  developmentUnit?: {
    id: string;
    reference: string;
    title?: string | null;
    status: string;
    typology?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    parkingSpots?: number | null;
    privateAreaM2?: number | null;
    price?: number | null;
    floor?: number | null;
    block?: string | null;
    tower?: string | null;
  } | null;
  realtor?: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
  } | null;
  user?: {
    id: string;
    name?: string | null;
    email: string;
  } | null;
  messages?: Array<{
    id: string;
    content: string;
    createdAt: string;
    senderId?: string | null;
  }>;
};

type DeveloperLeadDetailResponse = {
  success: boolean;
  workspace: {
    teamId: string;
    teamName: string | null;
    viewerWorkspaceRole: string | null;
    canManageWorkspace: boolean;
  };
  lead: DeveloperLeadDetail;
};

type DeveloperLeadNote = {
  id: string;
  leadId: string;
  realtorId: string;
  content: string;
  createdAt: string | null;
  author?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

function formatPrice(value?: number | null) {
  if (typeof value !== "number") return "Preço não informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value / 100);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function stageLabel(stage?: string | null) {
  const s = String(stage || "").toUpperCase();
  if (!s) return "Novo";
  if (s === "NEW") return "Novo";
  if (s === "CONTACT") return "Em contato";
  if (s === "VISIT") return "Visita";
  if (s === "PROPOSAL") return "Proposta";
  if (s === "DOCUMENTS") return "Documentos";
  if (s === "WON") return "Fechado";
  if (s === "LOST") return "Perdido";
  return s;
}

const PIPELINE_STAGE_FLOW = ["NEW", "CONTACT", "VISIT", "PROPOSAL", "DOCUMENTS", "WON", "LOST"] as const;
type PipelineStage = (typeof PIPELINE_STAGE_FLOW)[number];

function stageRank(stage?: string | null) {
  const normalized = String(stage || "NEW").toUpperCase();
  const index = PIPELINE_STAGE_FLOW.indexOf(normalized as PipelineStage);
  return index >= 0 ? index : 0;
}

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{value}</div>
      <div className="mt-2 text-sm text-neutral-600">{helper}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-neutral-100 py-3 text-sm md:grid-cols-[160px_minmax(0,1fr)] md:gap-4">
      <div className="font-medium text-neutral-500">{label}</div>
      <div className="text-neutral-900 break-words">{value}</div>
    </div>
  );
}

export default function DeveloperLeadDetailPage() {
  const params = useParams<{ id: string }>();
  const { status } = useSession();
  const router = useRouter();

  const [response, setResponse] = useState<DeveloperLeadDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<DeveloperLeadNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PipelineStage>("NEW");
  const [stageSaving, setStageSaving] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    if (!params?.id) return;

    try {
      setLoading(true);
      setError(null);

      const result = await fetch(`/api/developer/leads/${params.id}`, { cache: "no-store" });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.success || !data?.lead) {
        throw new Error(data?.error || "Não conseguimos carregar este lead do workspace.");
      }

      setResponse(data as DeveloperLeadDetailResponse);
    } catch (err: any) {
      console.error("Error fetching developer lead detail:", err);
      setError(err?.message || "Não conseguimos carregar este lead do workspace.");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  const fetchNotes = useCallback(async () => {
    if (!params?.id) return;

    try {
      setNotesLoading(true);
      setNotesError(null);

      const result = await fetch(`/api/developer/leads/${params.id}/notes`, { cache: "no-store" });
      const data = await result.json().catch(() => null);

      if (!result.ok) {
        throw new Error(data?.error || "Não conseguimos carregar as notas deste lead agora.");
      }

      setNotes(Array.isArray(data?.notes) ? data.notes : []);
    } catch (err: any) {
      console.error("Error fetching developer lead notes:", err);
      setNotes([]);
      setNotesError(err?.message || "Não conseguimos carregar as notas deste lead agora.");
    } finally {
      setNotesLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = params?.id ? `/developer/leads/${params.id}` : "/developer/leads";
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    if (status !== "authenticated" || !params?.id) return;
    void fetchLead();
    void fetchNotes();
  }, [fetchLead, fetchNotes, params?.id, router, status]);

  const lead = response?.lead || null;
  const currentStage = useMemo<PipelineStage>(() => {
    const normalized = String(lead?.pipelineStage || "NEW").toUpperCase();
    if (PIPELINE_STAGE_FLOW.includes(normalized as PipelineStage)) {
      return normalized as PipelineStage;
    }
    return "NEW";
  }, [lead?.pipelineStage]);

  useEffect(() => {
    setSelectedStage(currentStage);
  }, [currentStage]);

  const handleSaveNote = useCallback(async () => {
    const content = noteDraft.trim();
    if (!params?.id || !content) return;

    try {
      setNoteSaving(true);
      setNotesError(null);

      const result = await fetch(`/api/developer/leads/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.note) {
        throw new Error(data?.error || "Não conseguimos salvar esta nota agora.");
      }

      setNotes((current) => [...current, data.note as DeveloperLeadNote]);
      setNoteDraft("");
      void fetchLead();
    } catch (err: any) {
      console.error("Error saving developer lead note:", err);
      setNotesError(err?.message || "Não conseguimos salvar esta nota agora.");
    } finally {
      setNoteSaving(false);
    }
  }, [fetchLead, noteDraft, params?.id]);

  const handleUpdateStage = useCallback(async () => {
    if (!params?.id || !response?.lead) return;
    if (selectedStage === currentStage) return;

    const nextLabel = stageLabel(selectedStage);
    const confirmed = window.confirm(
      selectedStage === "LOST"
        ? "Tem certeza que deseja marcar este lead como perdido?"
        : `Deseja mover este lead para a etapa \"${nextLabel}\"?`
    );

    if (!confirmed) return;

    const previousLead = response.lead;

    try {
      setStageSaving(true);
      setStageError(null);
      setResponse((current) =>
        current
          ? {
              ...current,
              lead: {
                ...current.lead,
                pipelineStage: selectedStage,
              },
            }
          : current
      );

      const result = await fetch(`/api/developer/leads/${params.id}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: selectedStage }),
      });
      const data = await result.json().catch(() => null);

      if (!result.ok || !data?.success || !data?.lead) {
        throw new Error(data?.error || "Não conseguimos atualizar a etapa deste lead agora.");
      }

      setResponse((current) =>
        current
          ? {
              ...current,
              lead: {
                ...current.lead,
                status: data.lead.status || current.lead.status,
                pipelineStage: data.lead.pipelineStage || current.lead.pipelineStage,
              },
            }
          : current
      );
    } catch (err: any) {
      console.error("Error updating developer lead pipeline stage:", err);
      setStageError(err?.message || "Não conseguimos atualizar a etapa deste lead agora.");
      setResponse((current) => (current ? { ...current, lead: previousLead } : current));
      setSelectedStage(currentStage);
    } finally {
      setStageSaving(false);
    }
  }, [currentStage, params?.id, response, selectedStage]);

  const canManagePipeline = Boolean(response?.workspace?.canManageWorkspace);
  const availableStageOptions = useMemo(() => {
    if (currentStage === "WON" || currentStage === "LOST") {
      return PIPELINE_STAGE_FLOW.filter((stage) => stage === currentStage);
    }

    const currentRank = stageRank(currentStage);
    return PIPELINE_STAGE_FLOW.filter((stage) => stageRank(stage) >= currentRank);
  }, [currentStage]);

  const timelineMessages = useMemo(
    () =>
      Array.isArray(lead?.messages)
        ? lead.messages.map((message) => ({
            id: String(message.id),
            content: String(message.content || ""),
            createdAt: String(message.createdAt || ""),
            senderId: message.senderId ? String(message.senderId) : undefined,
          }))
        : [],
    [lead?.messages]
  );
  const leadDisplayId = lead?.publicCode ? formatPublicCode(String(lead.publicCode)) : lead?.id ? (lead.id.length <= 8 ? lead.id : lead.id.slice(-8)) : "";
  const mainArea = lead?.property?.areaM2 ?? lead?.property?.usableAreaM2 ?? lead?.property?.builtAreaM2 ?? lead?.property?.privateAreaM2 ?? lead?.property?.lotAreaM2 ?? null;

  if (loading) {
    return <CenteredSpinner message="Carregando lead do workspace..." />;
  }

  if (error || !response || !lead) {
    return (
      <DashboardLayout
        title="Lead"
        description="Detalhe operacional do lead do empreendimento."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Incorporadora", href: "/developer" },
          { label: "Leads", href: "/developer/leads" },
          { label: "Lead" },
        ]}
      >
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 shadow-sm">
          <EmptyState
            title="Não conseguimos carregar este lead"
            description={error || "Ele pode ter sido removido ou estar fora do seu workspace."}
            action={
              <button
                type="button"
                onClick={() => void fetchLead()}
                className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Tentar novamente
              </button>
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={lead.property?.title || "Lead"}
      description="Leitura operacional do lead vinculado ao empreendimento ou unidade."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Incorporadora", href: "/developer" },
        { label: "Leads", href: "/developer/leads" },
        { label: leadDisplayId || "Lead" },
      ]}
      actions={
        <div className="flex flex-wrap gap-3">
          {lead.developmentProject?.id ? (
            <Link
              href={`/developer/projects/${lead.developmentProject.id}`}
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Ver empreendimento
            </Link>
          ) : null}
          <Link
            href="/developer/leads"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos leads
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Etapa" value={stageLabel(lead.pipelineStage)} helper="Posição atual no funil" />
          <MetricCard label="Status" value={lead.status || "Não definido"} helper="Status técnico do lead" />
          <MetricCard label="Criado em" value={new Date(lead.createdAt).toLocaleDateString("pt-BR")} helper="Entrada no workspace" />
          <MetricCard label="ID" value={leadDisplayId || lead.id} helper="Identificador operacional" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="relative h-28 w-28 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                  <Image src={lead.property?.images?.[0]?.url || "/placeholder.jpg"} alt={lead.property?.title || "Imóvel"} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {lead.developmentProject ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                        <Building2 className="h-3.5 w-3.5" />
                        {lead.developmentProject.name}
                      </span>
                    ) : null}
                    {lead.developmentUnit ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-teal-700">
                        <DoorOpen className="h-3.5 w-3.5" />
                        {lead.developmentUnit.title || lead.developmentUnit.reference}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">{lead.property?.title || "Imóvel"}</h2>
                  <div className="mt-1 text-lg font-semibold text-teal-700">{formatPrice(lead.property?.price)}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {[lead.property?.street, lead.property?.neighborhood, lead.property?.city, lead.property?.state].filter(Boolean).join(" · ")}
                    </span>
                    {lead.visitDate || lead.visitTime ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {lead.visitDate || "Data a confirmar"}{lead.visitTime ? ` · ${lead.visitTime}` : ""}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-neutral-700">
                    {lead.property?.bedrooms != null ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1">
                        <BedDouble className="h-3.5 w-3.5" />
                        {lead.property.bedrooms} quartos
                      </span>
                    ) : null}
                    {lead.property?.bathrooms != null ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1">
                        <Bath className="h-3.5 w-3.5" />
                        {lead.property.bathrooms} banheiros
                      </span>
                    ) : null}
                    {mainArea != null ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1">
                        <Ruler className="h-3.5 w-3.5" />
                        {mainArea}m²
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-neutral-950">Resumo do lead</h3>
              <div className="mt-4">
                <InfoRow label="Contato" value={lead.contact?.name || lead.contact?.email || "Não informado"} />
                <InfoRow label="Email" value={lead.contact?.email || "Não informado"} />
                <InfoRow label="Telefone" value={lead.contact?.phone || "Não informado"} />
                <InfoRow label="Criado em" value={formatDateTime(lead.createdAt)} />
                <InfoRow label="Respondido em" value={formatDateTime(lead.respondedAt)} />
                <InfoRow label="Concluído em" value={formatDateTime(lead.completedAt)} />
                <InfoRow label="Mensagem inicial" value={lead.message || "Não informada"} />
                <InfoRow label="Observações do cliente" value={lead.clientNotes || "Não informadas"} />
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-neutral-950">Ação de pipeline</h3>
              <p className="mt-1 text-sm text-neutral-600">Avance a etapa do lead dentro do funil comercial do lançamento.</p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <label className="space-y-2 text-sm text-neutral-700">
                  <span className="block font-medium">Próxima etapa</span>
                  <select
                    value={selectedStage}
                    onChange={(event) => {
                      setSelectedStage(event.target.value as PipelineStage);
                      setStageError(null);
                    }}
                    disabled={!canManagePipeline || stageSaving}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-neutral-100"
                  >
                    {availableStageOptions.map((stage) => (
                      <option key={stage} value={stage}>{stageLabel(stage)}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={handleUpdateStage}
                  disabled={!canManagePipeline || stageSaving || selectedStage === currentStage}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {stageSaving ? "Salvando..." : "Atualizar etapa"}
                </button>
              </div>

              {!canManagePipeline ? (
                <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                  Seu perfil neste workspace pode acompanhar o lead, mas não alterar a etapa do pipeline.
                </div>
              ) : null}

              {stageError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{stageError}</div> : null}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-neutral-950">Linha do tempo</h3>
              <LeadTimeline
                leadId={lead.id}
                createdAt={lead.createdAt}
                respondedAt={lead.respondedAt}
                completedAt={lead.completedAt}
                pipelineStage={lead.pipelineStage || undefined}
                messages={timelineMessages}
                eventsPath={`/api/developer/leads/${lead.id}/events`}
              />
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-neutral-950">Notas internas</h3>
              <p className="mt-1 text-sm text-neutral-600">Registre contexto comercial e operacional deste lead dentro do workspace.</p>

              <div className="mt-4 space-y-3">
                {notesLoading ? (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">Carregando notas...</div>
                ) : notes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">Nenhuma nota registrada para este lead ainda.</div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-neutral-950">{note.author?.name || note.author?.email || "Membro do workspace"}</div>
                        <div className="text-xs text-neutral-500">{formatDateTime(note.createdAt)}</div>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{note.content}</div>
                    </div>
                  ))
                )}
              </div>

              {notesError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{notesError}</div> : null}

              <div className="mt-4 space-y-3">
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  rows={4}
                  placeholder="Ex.: interesse alto nesta unidade, pediu retorno após aprovação de crédito, comparar com tipologia similar..."
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
                  disabled={noteSaving}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={noteSaving || !noteDraft.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {noteSaving ? "Salvando..." : "Salvar nota"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-neutral-950">Contato</h3>
              <div className="mt-4 space-y-3 text-sm text-neutral-700">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 font-semibold text-neutral-950">
                  {lead.contact?.name || "Contato não identificado"}
                </div>
                {lead.contact?.email ? (
                  <a href={`mailto:${lead.contact.email}`} className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50">
                    <Mail className="h-4 w-4 text-neutral-500" />
                    <span>{lead.contact.email}</span>
                  </a>
                ) : null}
                {lead.contact?.phone ? (
                  <a href={`tel:${lead.contact.phone}`} className="flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50">
                    <Phone className="h-4 w-4 text-neutral-500" />
                    <span>{lead.contact.phone}</span>
                  </a>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-neutral-950">Vínculo do lançamento</h3>
              <div className="mt-4 space-y-3 text-sm text-neutral-700">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Empreendimento</div>
                  <div className="mt-1 font-semibold text-neutral-950">{lead.developmentProject?.name || "Não vinculado"}</div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Unidade</div>
                  <div className="mt-1 font-semibold text-neutral-950">{lead.developmentUnit?.title || lead.developmentUnit?.reference || "Não vinculada"}</div>
                </div>
                {lead.developmentUnit ? (
                  <Link
                    href={`/developer/leads?projectId=${lead.developmentProject?.id || ""}&unitId=${lead.developmentUnit.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Ver leads desta unidade
                  </Link>
                ) : lead.developmentProject ? (
                  <Link
                    href={`/developer/leads?projectId=${lead.developmentProject.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Ver leads deste empreendimento
                  </Link>
                ) : null}
              </div>
            </section>

            {lead.realtor ? (
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-neutral-950">Responsável atual</h3>
                <div className="mt-4 space-y-3 text-sm text-neutral-700">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <div className="font-semibold text-neutral-950">{lead.realtor.name}</div>
                    <div className="mt-1 text-neutral-600">{lead.realtor.email}</div>
                    {lead.realtor.role ? <div className="mt-1 text-xs uppercase tracking-wide text-neutral-500">{lead.realtor.role}</div> : null}
                  </div>
                </div>
              </section>
            ) : null}

            {lead.developmentUnit ? (
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-neutral-950">Dados da unidade</h3>
                <div className="mt-4">
                  <InfoRow label="Referência" value={lead.developmentUnit.reference} />
                  <InfoRow label="Título" value={lead.developmentUnit.title || "Não informado"} />
                  <InfoRow label="Status" value={lead.developmentUnit.status || "Não informado"} />
                  <InfoRow label="Tipologia" value={lead.developmentUnit.typology || "Não informada"} />
                  <InfoRow label="Preço" value={formatPrice(lead.developmentUnit.price)} />
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
