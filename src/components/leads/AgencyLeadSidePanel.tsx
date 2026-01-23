"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Drawer from "@/components/ui/Drawer";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import LeadTimeline from "@/components/crm/LeadTimeline";

type Lead = {
  id: string;
  status: string;
  createdAt: string;
  respondedAt?: string | null;
  completedAt?: string | null;
  pipelineStage?: string | null;
  realtor?: { id: string; name: string | null; email: string | null } | null;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
  property?: {
    id: string;
    title: string;
    city: string;
    state: string;
  } | null;
  contact?: {
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
};

type LeadNote = {
  id: string;
  leadId: string;
  realtorId: string;
  content: string;
  createdAt: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

export default function AgencyLeadSidePanel({
  open,
  leadId,
  initialTab = "ATIVIDADES",
  onClose,
}: {
  open: boolean;
  leadId: string | null;
  initialTab?: "ATIVIDADES" | "NOTAS";
  onClose: () => void;
}) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"ATIVIDADES" | "NOTAS">(initialTab);

  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesLoadedLeadId, setNotesLoadedLeadId] = useState<string | null>(null);

  const title = lead?.contact?.name || lead?.property?.title || "Lead";

  const loadLead = useCallback(async () => {
    if (!leadId) return;
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.success) throw new Error(data?.error || "Erro ao carregar lead");
      setLead((data?.lead || null) as any);
    } catch (e: any) {
      setLead(null);
      setError(e?.message || "Erro ao carregar lead");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const loadNotes = useCallback(async () => {
    if (!leadId) return;
    setNotesError(null);
    setNotesLoading(true);
    try {
      const r = await fetch(`/api/leads/${encodeURIComponent(leadId)}/notes`, { cache: "no-store" });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.error || "Erro ao carregar notas");
      setNotes(Array.isArray(data?.notes) ? data.notes : []);
      setNotesLoadedLeadId(String(leadId));
    } catch (e: any) {
      setNotes([]);
      setNotesError(e?.message || "Erro ao carregar notas");
      setNotesLoadedLeadId(String(leadId));
    } finally {
      setNotesLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (!open) return;
    if (!leadId) return;
    setActiveTab(initialTab);
    setLead(null);
    setError(null);
    setNotes([]);
    setNotesError(null);
    setNotesLoadedLeadId(null);
    void loadLead();
  }, [open, leadId, initialTab, loadLead]);

  useEffect(() => {
    if (!open) return;
    if (!leadId) return;

    if (activeTab === "NOTAS" && !notesLoading && notesLoadedLeadId !== String(leadId)) {
      void loadNotes();
    }
  }, [open, leadId, activeTab, notesLoading, notesLoadedLeadId, loadNotes]);

  const header = useMemo(() => {
    if (!lead) return null;

    const contactLine = lead.contact?.email
      ? String(lead.contact.email)
      : lead.contact?.phone
        ? String(lead.contact.phone)
        : null;

    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">{lead.contact?.name || "Lead"}</div>
          {contactLine ? <div className="text-xs text-gray-600 mt-0.5">{contactLine}</div> : null}
          <div className="mt-3 grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-gray-500">Etapa</span>
              <span className="font-semibold text-gray-800">{lead.pipelineStage || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-gray-500">Responsável</span>
              <span className="font-semibold text-gray-800">
                {lead.realtor?.name || lead.realtor?.email || "Sem responsável"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-gray-500">Criado</span>
              <span className="font-semibold text-gray-800">{formatDateTime(lead.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-gray-500">Última resposta</span>
              <span className="font-semibold text-gray-800">{formatDateTime(lead.respondedAt || null)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-900">Próximo passo</div>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-gray-500">Data</span>
              <span className="font-semibold text-gray-800">{formatDateTime(lead.nextActionDate || null)}</span>
            </div>
            <div className="text-xs text-gray-700 whitespace-pre-wrap">{lead.nextActionNote || "-"}</div>
          </div>
        </div>
      </div>
    );
  }, [lead]);

  const tabs = useMemo(() => {
    const activitiesContent = lead ? (
      <LeadTimeline
        leadId={lead.id}
        createdAt={lead.createdAt}
        respondedAt={lead.respondedAt || null}
        completedAt={lead.completedAt || null}
        pipelineStage={lead.pipelineStage || undefined}
      />
    ) : null;

    const notesContent = (
      <div className="space-y-3">
        {notesError ? <div className="text-xs text-red-600">{notesError}</div> : null}
        {notesLoading ? (
          <div className="text-xs text-gray-500">Carregando notas...</div>
        ) : notes.length ? (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{n.content}</div>
                <div className="text-[11px] text-gray-500 mt-1">{formatDateTime(n.createdAt)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600">Nenhuma nota ainda.</div>
        )}
      </div>
    );

    return [
      { key: "ATIVIDADES", label: "Atividades", content: activitiesContent },
      { key: "NOTAS", label: "Notas", content: notesContent },
    ];
  }, [lead, notes, notesError, notesLoading]);

  return (
    <Drawer open={open} onClose={onClose} title={title} side="right">
      {loading ? (
        <div className="py-10 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-gray-600">Carregando lead...</div>
        </div>
      ) : error ? (
        <EmptyState title="Não foi possível carregar" description={error} />
      ) : !lead ? (
        <EmptyState title="Lead não encontrado" description="Este lead não está mais disponível." />
      ) : (
        <div className="space-y-5">
          {header}

          <Tabs
            key={`${leadId || ""}:${initialTab}`}
            items={tabs}
            defaultKey={initialTab}
            onChange={(k) => setActiveTab(k as any)}
            className=""
            bleed={false}
          />
        </div>
      )}
    </Drawer>
  );
}
