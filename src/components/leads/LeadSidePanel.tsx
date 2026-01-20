"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bath, BedDouble, Car, CheckCircle, ExternalLink, Mail, MessageCircle, Phone, Ruler, XCircle } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Tabs from "@/components/ui/Tabs";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import LeadTimeline from "@/components/crm/LeadTimeline";
import { useToast } from "@/contexts/ToastContext";

type LeadStatus = "RESERVED" | "ACCEPTED" | "COMPLETED" | string;

type Lead = {
  id: string;
  status: LeadStatus;
  createdAt: string;
  respondedAt?: string | null;
  completedAt?: string | null;
  reservedUntil?: string | null;
  pipelineStage?: string | null;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
  lastContactAt?: string | null;
  hasUnreadMessages?: boolean;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastMessageFromClient?: boolean;
  clientChatToken?: string | null;
  property: {
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
    parkingSpots?: number | null;
    images: Array<{ url: string }>;
  };
  contact?: {
    name: string;
    email: string;
    phone?: string | null;
  };
};

type LeadNote = {
  id: string;
  leadId: string;
  realtorId: string;
  content: string;
  createdAt: string;
};

function formatPrice(value: number) {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    return String(value);
  }
}

function getWhatsAppUrl(phone: string | null | undefined) {
  const raw = String(phone || "").replace(/\D/g, "");
  if (!raw) return null;
  const withCountry = raw.startsWith("55") ? raw : `55${raw}`;
  return `https://wa.me/${withCountry}`;
}

export default function LeadSidePanel({
  open,
  leadId,
  onClose,
  onLeadUpdated,
}: {
  open: boolean;
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated?: () => void;
}) {
  const toast = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"ATIVIDADES" | "NOTAS" | "IMOVEL">("ATIVIDADES");

  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [notesLoadedLeadId, setNotesLoadedLeadId] = useState<string | null>(null);

  const title = lead?.property?.title ? lead.property.title : "Lead";

  const loadLead = useCallback(async () => {
    if (!leadId) return;
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/leads/${leadId}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro ao carregar lead");
      setLead(data?.lead || null);
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
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12000);
      const r = await fetch(`/api/leads/${leadId}/notes`, { signal: controller.signal });
      window.clearTimeout(timeout);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro ao carregar notas");
      setNotes(Array.isArray(data?.notes) ? data.notes : []);
      setNotesLoadedLeadId(leadId);
    } catch (e: any) {
      setNotes([]);
      setNotesError(e?.message || "Erro ao carregar notas");
      setNotesLoadedLeadId(leadId);
    } finally {
      setNotesLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (!open) return;
    if (!leadId) return;
    setActiveTab("ATIVIDADES");
    setNoteDraft("");
    setNotes([]);
    setNotesLoading(false);
    setNotesError(null);
    setNotesLoadedLeadId(null);
    void loadLead();
  }, [open, leadId, loadLead]);

  useEffect(() => {
    if (!open) return;
    if (!leadId) return;
    if (activeTab === "NOTAS" && !notesLoading && notesLoadedLeadId !== leadId) void loadNotes();
  }, [open, leadId, activeTab, notesLoading, notesLoadedLeadId, loadNotes]);

  const handleAccept = useCallback(async () => {
    if (!leadId) return;
    try {
      const r = await fetch(`/api/leads/${leadId}/accept`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro ao aceitar lead");
      toast.success("Lead aceito");
      await loadLead();
      onLeadUpdated?.();
    } catch (e: any) {
      toast.error("Erro ao aceitar lead", e?.message || undefined);
    }
  }, [leadId, toast, loadLead, onLeadUpdated]);

  const handleReject = useCallback(async () => {
    if (!leadId) return;
    try {
      const r = await fetch(`/api/leads/${leadId}/reject`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro ao recusar lead");
      toast.success("Lead recusado");
      onClose();
      onLeadUpdated?.();
    } catch (e: any) {
      toast.error("Erro ao recusar lead", e?.message || undefined);
    }
  }, [leadId, toast, onClose, onLeadUpdated]);

  const handleComplete = useCallback(async () => {
    if (!leadId) return;
    try {
      const r = await fetch(`/api/leads/${leadId}/complete`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro ao encerrar lead");
      toast.success("Lead encerrado");
      await loadLead();
      onLeadUpdated?.();
    } catch (e: any) {
      toast.error("Erro ao encerrar lead", e?.message || undefined);
    }
  }, [leadId, toast, loadLead, onLeadUpdated]);

  const handleAddNote = useCallback(async () => {
    if (!leadId) return;
    const content = String(noteDraft || "").trim();
    if (!content) return;

    setNotesError(null);
    setNotesLoading(true);
    try {
      const r = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Erro ao salvar nota");
      setNoteDraft("");
      await loadNotes();
      toast.success("Nota salva");
      onLeadUpdated?.();
    } catch (e: any) {
      setNotesError(e?.message || "Erro ao salvar nota");
      toast.error("Erro ao salvar nota", e?.message || undefined);
    } finally {
      setNotesLoading(false);
    }
  }, [leadId, noteDraft, loadNotes, toast, onLeadUpdated]);

  const header = useMemo(() => {
    if (!lead) return null;

    const img = lead.property?.images?.[0]?.url || "/placeholder.jpg";
    const address = [
      lead.property.street,
      lead.property.neighborhood,
      lead.property.city ? `${lead.property.city}/${lead.property.state}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const metrics: Array<{ key: string; icon: any; label: string; value: string | number }> = [];
    if (lead.property?.bedrooms) metrics.push({ key: "beds", icon: BedDouble, label: "Quartos", value: lead.property.bedrooms });
    if (lead.property?.bathrooms) metrics.push({ key: "baths", icon: Bath, label: "Banheiros", value: lead.property.bathrooms });
    if (lead.property?.areaM2) metrics.push({ key: "area", icon: Ruler, label: "Área", value: `${lead.property.areaM2}m²` });
    if (lead.property?.parkingSpots) metrics.push({ key: "parking", icon: Car, label: "Vagas", value: lead.property.parkingSpots });

    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 ring-1 ring-black/5">
              <Image src={img} alt={lead.property.title} fill className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 line-clamp-2">{lead.property.title}</div>
              <div className="text-teal-700 font-bold mt-0.5">{formatPrice(lead.property.price)}</div>
              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{address}</div>
              {metrics.length ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {metrics.map((m) => {
                    const Icon = m.icon;
                    return (
                      <span
                        key={m.key}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium"
                        title={m.label}
                      >
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                        <span className="tabular-nums">{m.value}</span>
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {lead.contact && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-900">{lead.contact.name}</div>
            <div className="text-xs text-gray-600 mt-0.5">{lead.contact.email}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {lead.contact.phone && (
                <a
                  href={`tel:${lead.contact.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Ligar
                </a>
              )}
              {getWhatsAppUrl(lead.contact.phone) && (
                <a
                  href={getWhatsAppUrl(lead.contact.phone) as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded-lg text-xs font-medium text-green-700 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              )}
              <a
                href={`mailto:${lead.contact.email}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {lead.status === "RESERVED" && (
            <>
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Aceitar
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors text-sm"
              >
                <XCircle className="w-4 h-4" />
                Recusar
              </button>
            </>
          )}

          {lead.status === "ACCEPTED" && (
            <>
              <button
                type="button"
                onClick={handleComplete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Encerrar
              </button>
              <Link
                href={`/broker/chats?lead=${lead.id}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </Link>
              <Link
                href={`/broker/leads/${lead.id}`}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Detalhes
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }, [lead, handleAccept, handleReject, handleComplete]);

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
        {notesError && <div className="text-xs text-red-600">{notesError}</div>}
        {notesLoading && notes.length === 0 ? (
          <div className="text-xs text-gray-500">Carregando...</div>
        ) : notes.length ? (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{n.content}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  {new Date(n.createdAt).toLocaleString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600">Nenhuma nota ainda.</div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-semibold text-gray-800">Adicionar nota</div>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Escreva uma nota..."
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleAddNote}
              disabled={notesLoading && notes.length === 0}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );

    const propertyContent = lead ? (
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">{lead.property.title}</div>
          <div className="text-teal-700 font-bold mt-1">{formatPrice(lead.property.price)}</div>
          <div className="text-xs text-gray-600 mt-1">
            {[lead.property.street, lead.property.neighborhood, `${lead.property.city}/${lead.property.state}`]
              .filter(Boolean)
              .join(", ")}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {lead.property.bedrooms ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium" title="Quartos">
                <BedDouble className="w-3.5 h-3.5 text-gray-500" />
                <span className="tabular-nums">{lead.property.bedrooms}</span>
              </span>
            ) : null}
            {lead.property.bathrooms ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium" title="Banheiros">
                <Bath className="w-3.5 h-3.5 text-gray-500" />
                <span className="tabular-nums">{lead.property.bathrooms}</span>
              </span>
            ) : null}
            {lead.property.areaM2 ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium" title="Área">
                <Ruler className="w-3.5 h-3.5 text-gray-500" />
                <span className="tabular-nums">{lead.property.areaM2}m²</span>
              </span>
            ) : null}
            {lead.property.parkingSpots ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium" title="Vagas">
                <Car className="w-3.5 h-3.5 text-gray-500" />
                <span className="tabular-nums">{lead.property.parkingSpots}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    ) : null;

    return [
      { key: "ATIVIDADES", label: "Atividades", content: activitiesContent },
      { key: "NOTAS", label: "Notas", content: notesContent },
      { key: "IMOVEL", label: "Imóvel", content: propertyContent },
    ];
  }, [lead, notes, notesLoading, notesError, noteDraft, handleAddNote]);

  return (
    <Drawer open={open} onClose={onClose} title={title} side="right">
      {loading ? (
        <CenteredSpinner message="Carregando lead..." />
      ) : error ? (
        <EmptyState title="Não foi possível carregar" description={error} />
      ) : !lead ? (
        <EmptyState title="Lead não encontrado" description="Este lead não está mais disponível." />
      ) : (
        <div className="space-y-5">
          {header}

          <Tabs
            items={tabs}
            defaultKey={"ATIVIDADES"}
            onChange={(k) => setActiveTab(k as any)}
            className=""
            bleed={false}
          />
        </div>
      )}
    </Drawer>
  );
}
