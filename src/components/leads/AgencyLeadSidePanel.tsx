"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import LeadTimeline from "@/components/crm/LeadTimeline";
import {
  buildAgencyLeadRecommendedMessage,
  buildAgencyLeadTemplateOptions,
  type AgencyLeadTemplateOption,
} from "@/lib/agency-lead-message-templates";

type PipelineMember = {
  userId: string;
  name: string | null;
  email: string | null;
  publicWhatsApp?: string | null;
  phoneNormalized?: string | null;
  phone?: string | null;
  role: string;
};

type Lead = {
  id: string;
  status: string;
  createdAt: string;
  pendingReplyAt?: string | null;
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

function whatsappNumberFromMember(member: PipelineMember | null) {
  if (!member) return null;
  const raw = String(member.publicWhatsApp || member.phoneNormalized || member.phone || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55")) return digits;
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

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
  members,
  onClose,
}: {
  open: boolean;
  leadId: string | null;
  initialTab?: "ATIVIDADES" | "NOTAS";
  members: PipelineMember[];
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

  const [templateModal, setTemplateModal] = useState<null | {
    leadId: string;
    channel: "CHAT" | "WHATSAPP";
    assignedId: string;
    whatsappNumber?: string | null;
    options: AgencyLeadTemplateOption[];
  }>(null);

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

    const assignedId = lead.realtor?.id ? String(lead.realtor.id) : "";
    const member = assignedId ? (members || []).find((m) => String(m.userId) === assignedId) || null : null;
    const wa = whatsappNumberFromMember(member);

    const templateCtx = {
      leadId: String(lead.id),
      realtorName: member?.name ?? lead.realtor?.name ?? null,
      contactName: lead.contact?.name ?? null,
      propertyTitle: lead.property?.title ?? null,
      pipelineStage: lead.pipelineStage ?? null,
      createdAt: lead.createdAt ?? null,
      pendingReplyAt: lead.pendingReplyAt ?? null,
      nextActionDate: lead.nextActionDate ?? null,
      hasAssignee: !!assignedId,
    };

    const fallbackMessage = buildAgencyLeadRecommendedMessage(templateCtx);
    const options = buildAgencyLeadTemplateOptions(templateCtx);
    const canChat = !!assignedId;
    const canWhatsApp = !!wa;

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
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-gray-900">Ações</div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                if (!canChat || e.shiftKey) {
                  setTemplateModal({
                    leadId: String(lead.id),
                    channel: "CHAT",
                    assignedId,
                    options,
                  });
                  return;
                }
                const qs = new URLSearchParams({ realtor: assignedId, text: fallbackMessage });
                window.open(`/agency/team-chat?${qs.toString()}`, "_blank");
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setTemplateModal({
                  leadId: String(lead.id),
                  channel: "CHAT",
                  assignedId,
                  options,
                });
              }}
              aria-disabled={!canChat}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 ${
                canChat ? "" : "opacity-50"
              }`}
              title={
                canChat
                  ? "Chat interno (Shift+clique ou clique direito para escolher)"
                  : "Sem responsável (clique para copiar mensagem)"
              }
              aria-label="Abrir chat interno"
            >
              <MessageCircle className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                if (!canWhatsApp || e.shiftKey) {
                  setTemplateModal({
                    leadId: String(lead.id),
                    channel: "WHATSAPP",
                    assignedId,
                    whatsappNumber: wa,
                    options,
                  });
                  return;
                }
                window.open(`https://wa.me/${wa}?text=${encodeURIComponent(fallbackMessage)}`, "_blank");
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setTemplateModal({
                  leadId: String(lead.id),
                  channel: "WHATSAPP",
                  assignedId,
                  whatsappNumber: wa,
                  options,
                });
              }}
              aria-disabled={!canWhatsApp}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 ${
                canWhatsApp ? "" : "opacity-50"
              }`}
              title={
                canWhatsApp
                  ? "WhatsApp (Shift+clique ou clique direito para escolher)"
                  : "WhatsApp indisponível (clique para copiar mensagem)"
              }
              aria-label="Abrir WhatsApp"
            >
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                <path d="M19.11 17.67c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.16-.43-2.2-1.38-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.41.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.02-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.98 2.64 1.11 2.82.14.18 1.93 2.95 4.67 4.13.65.28 1.16.45 1.55.58.65.21 1.25.18 1.72.11.52-.08 1.6-.65 1.83-1.27.23-.63.23-1.16.16-1.27-.07-.11-.25-.18-.52-.32z" />
                <path d="M26.68 5.32C23.93 2.57 20.28 1.05 16.4 1.05 8.39 1.05 1.88 7.56 1.88 15.57c0 2.56.67 5.06 1.94 7.26L1.76 30.95l8.29-2.17c2.11 1.15 4.48 1.75 6.9 1.75h.01c8.01 0 14.52-6.51 14.52-14.52 0-3.88-1.51-7.53-4.27-10.69zm-10.27 22.7h-.01c-2.18 0-4.31-.59-6.16-1.7l-.44-.26-4.92 1.29 1.31-4.8-.29-.49c-1.21-1.96-1.85-4.22-1.85-6.54 0-6.83 5.56-12.39 12.39-12.39 3.31 0 6.42 1.29 8.76 3.63 2.34 2.34 3.63 5.46 3.63 8.76 0 6.83-5.56 12.5-12.42 12.5z" />
              </svg>
            </button>
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
  }, [lead, members]);

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

      {templateModal &&
        createPortal(
          <div className="fixed inset-0 z-[70000]">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setTemplateModal(null)}
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-gray-200">
                  <div className="text-sm font-semibold text-gray-900">Escolher mensagem</div>
                  <div className="text-xs text-gray-500 mt-0.5">Lead {templateModal.leadId}</div>
                </div>
                <div className="p-4 space-y-2">
                  {templateModal.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const canOpenChat = templateModal.channel === "CHAT" && !!templateModal.assignedId;
                        const canOpenWa =
                          templateModal.channel === "WHATSAPP" &&
                          !!String(templateModal.whatsappNumber || "").trim();

                        if (canOpenWa) {
                          const wa = String(templateModal.whatsappNumber || "").trim();
                          window.open(`https://wa.me/${wa}?text=${encodeURIComponent(opt.text)}`, "_blank");
                        } else if (canOpenChat) {
                          const qs = new URLSearchParams({ realtor: templateModal.assignedId, text: opt.text });
                          window.open(`/agency/team-chat?${qs.toString()}`, "_blank");
                        } else {
                          try {
                            void navigator.clipboard.writeText(opt.text);
                          } catch {
                          }
                        }
                        setTemplateModal(null);
                      }}
                      className="w-full text-left rounded-xl border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
                    >
                      <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
                      <div className="mt-1 text-xs text-gray-600 line-clamp-2">{opt.text}</div>
                    </button>
                  ))}
                </div>
                <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setTemplateModal(null)}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </Drawer>
  );
}
