"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Phone,
  User as UserIcon,
} from "lucide-react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import LeadTimeline from "@/components/crm/LeadTimeline";
import { buildPropertyPath } from "@/lib/slug";

interface Lead {
  id: string;
  createdAt: string;
  respondedAt?: string | null;
  completedAt?: string | null;
  pipelineStage?: "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";
  status?: string | null;
  pendingReplyAt?: string | null;
  clientChatToken?: string | null;
  isDirect?: boolean;
  visitDate?: string | null;
  visitTime?: string | null;
  clientNotes?: string | null;
  message?: string | null;
  property?: {
    id: string;
    title: string;
    price: number | null;
    purpose?: "SALE" | "RENT" | null;
    type?: string | null;
    city: string;
    state: string;
    neighborhood?: string | null;
    street?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaM2?: number | null;
    images?: { url: string }[];
  } | null;
  contact?: {
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  realtor?: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
  } | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface SimilarPropertyItem {
  property: {
    id: string;
    title: string;
    price: number | null;
    city: string;
    state: string;
    neighborhood?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaM2?: number | null;
    images: { url: string }[];
  };
  matchScore: number;
  matchReasons: string[];
}

export default function LeadDetailPage() {
  const params = useParams();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [similarItems, setSimilarItems] = useState<SimilarPropertyItem[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [shareGenerating, setShareGenerating] = useState(false);

  const leadId = (params?.id as string) || "";
  const toast = useToast();

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const getClientChatUrl = (token: string) => {
    const path = `/chat/${token}`;
    return siteUrl ? `${siteUrl}${path}` : path;
  };

  const getWhatsAppUrl = (phone: string | null | undefined) => {
    const raw = String(phone || "").replace(/\D/g, "");
    if (!raw) return null;
    const withCountry = raw.startsWith("55") ? raw : `55${raw}`;
    return `https://wa.me/${withCountry}`;
  };

  const formatPrice = (price?: number | null) => {
    if (typeof price !== "number") return "Preço sob consulta";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const formatPurpose = (purpose?: "SALE" | "RENT" | null) => {
    if (purpose === "RENT") return "Locação";
    if (purpose === "SALE") return "Venda";
    return "Não informado";
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "Não informado";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Não informado";
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };

  const getLeadOriginLabel = (l: Lead) => {
    if (l.visitDate || l.visitTime) return "Pedido de visita";
    if (l.isDirect) return "Contato direto";
    return "Formulário";
  };

  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => (
    <div className="grid grid-cols-3 gap-3 py-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="col-span-2 text-xs text-gray-900 font-medium break-words">{value}</div>
    </div>
  );

  const fetchLead = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/leads/${leadId}`);
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos encontrar este lead agora.");
      }

      setLead(data.lead);
    } catch (err: any) {
      console.error("Error fetching lead detail:", err);
      setError(err?.message || "Não conseguimos carregar os detalhes deste lead agora.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const fetchSimilar = useCallback(async () => {
    try {
      setSimilarError(null);
      setSimilarLoading(true);

      const response = await fetch(`/api/leads/${leadId}/similar-properties?limit=6`);
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            "Não conseguimos carregar imóveis similares do seu estoque agora. Se quiser, tente novamente em alguns instantes."
        );
      }

      setSimilarItems(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      console.error("Error fetching similar properties:", err);
      setSimilarError(
        err?.message ||
          "Não conseguimos carregar imóveis similares do seu estoque agora. Se quiser, tente novamente em alguns instantes."
      );
      setSimilarItems([]);
    } finally {
      setSimilarLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (!leadId) return;
    fetchLead();
    fetchSimilar();
  }, [leadId, fetchLead, fetchSimilar]);

  const handleGenerateSimilarLink = async () => {
    if (!leadId) return;
    try {
      setShareGenerating(true);

      const body: any = {};
      if (similarItems.length > 0) {
        body.propertyIds = similarItems.map((item) => item.property.id);
      }

      const response = await fetch(`/api/leads/${leadId}/similar-properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Não conseguimos gerar o link de imóveis similares agora. Tente novamente em alguns instantes."
        );
      }

      setShareUrl(data.shareUrl || null);
      setShareExpiresAt(data.expiresAt || null);

      toast.success(
        "Link gerado!",
        "Você pode enviar este link para o cliente ver outros imóveis do seu estoque."
      );
    } catch (err: any) {
      console.error("Error generating similar properties link:", err);
      toast.error(
        "Erro ao gerar link",
        err?.message || "Não conseguimos gerar o link de imóveis similares agora. Tente novamente em alguns instantes."
      );
    } finally {
      setShareGenerating(false);
    }
  };

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado!", `${label} copiado para a área de transferência.`);
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      toast.error("Não foi possível copiar", "Seu navegador bloqueou a cópia. Tente novamente.");
    }
  };

  if (loading) {
    return <CenteredSpinner message="Carregando detalhes do lead..." />;
  }

  if (error || !lead) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <EmptyState
          title="Não conseguimos carregar este lead"
          description={error || "Ele pode ter sido removido ou não está mais ativo na sua lista."}
          action={
            <button
              onClick={fetchLead}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold"
            >
              Tentar novamente
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-start gap-4 p-4">
              <div className="relative w-20 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {lead.property?.images?.[0]?.url ? (
                  <Image
                    src={lead.property.images[0].url}
                    alt={lead.property.title || "Imóvel"}
                    fill
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{lead.property?.title || "Imóvel"}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                      {lead.property?.neighborhood ? `${lead.property.neighborhood}, ` : ""}
                      {lead.property?.city}/{lead.property?.state}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-900">{formatPrice(lead.property?.price)}</p>
                  </div>
                  {lead.property?.id ? (
                    <Link
                      href={buildPropertyPath(lead.property.id, lead.property.title || "imovel")}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800"
                    >
                      Ver anúncio
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <LeadTimeline
              leadId={leadId}
              createdAt={lead.createdAt}
              respondedAt={lead.respondedAt}
              completedAt={lead.completedAt}
              pipelineStage={lead.pipelineStage}
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">Similares</h2>
                <p className="text-[11px] text-gray-500">Imóveis do seu estoque que podem ajudar a fechar esse lead.</p>
              </div>
              <button
                type="button"
                onClick={handleGenerateSimilarLink}
                disabled={shareGenerating}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold glass-teal text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {shareGenerating ? "Gerando..." : (
                  <>
                    <LinkIcon className="w-3.5 h-3.5" />
                    Gerar link
                  </>
                )}
              </button>
            </div>

            <div className="p-4">
              {similarError && <p className="text-[11px] text-red-600 mb-2">{similarError}</p>}

              {similarLoading && !similarItems.length ? (
                <p className="text-xs text-gray-500">Buscando imóveis do seu estoque...</p>
              ) : similarItems.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Ainda não encontramos imóveis seus parecidos com este. Assim que você tiver mais imóveis na mesma região e faixa de preço,
                  eles aparecem aqui.
                </p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {similarItems.map((item) => (
                    <Link
                      key={item.property.id}
                      href={buildPropertyPath(item.property.id, item.property.title)}
                      className="min-w-[240px] max-w-[240px] rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors overflow-hidden"
                    >
                      <div className="relative h-28 w-full bg-gray-100">
                        {item.property.images?.[0]?.url ? (
                          <Image src={item.property.images[0].url} alt={item.property.title} fill className="object-cover" />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-gray-900 line-clamp-2">{item.property.title}</p>
                        <p className="mt-1 text-[11px] text-gray-500 truncate">
                          {item.property.neighborhood ? `${item.property.neighborhood}, ` : ""}
                          {item.property.city}/{item.property.state}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-900 font-semibold">{formatPrice(item.property.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {shareUrl && (
                <div className="mt-3 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-2 py-1 rounded border border-gray-200 bg-white text-[11px] text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard("Link", shareUrl)}
                      className="px-2 py-1 rounded bg-gray-900 text-white text-[11px] font-semibold"
                    >
                      Copiar
                    </button>
                  </div>
                  {shareExpiresAt && (
                    <p className="mt-1 text-[10px] text-gray-500">
                      Válido até {new Date(shareExpiresAt).toLocaleDateString("pt-BR")}.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-gray-700" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">Cliente</h2>
                <p className="text-[11px] text-gray-500">Dados de contato do lead.</p>
              </div>
            </div>

            <div className="mt-3">
              <InfoRow label="Nome" value={lead.contact?.name || lead.user?.name || "Não informado"} />
              <div className="h-px bg-gray-100" />
              <InfoRow label="E-mail" value={lead.contact?.email || lead.user?.email || "Não informado"} />
              <div className="h-px bg-gray-100" />
              <InfoRow label="Telefone" value={lead.contact?.phone || "Não informado"} />

              <div className="mt-3 flex flex-wrap gap-2">
                {lead.contact?.phone ? (
                  <a
                    href={`tel:${lead.contact.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Ligar
                  </a>
                ) : null}
                {getWhatsAppUrl(lead.contact?.phone) ? (
                  <a
                    href={getWhatsAppUrl(lead.contact?.phone) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded-lg text-xs font-medium text-green-700 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                ) : null}
                {lead.contact?.email || lead.user?.email ? (
                  <a
                    href={`mailto:${lead.contact?.email || lead.user?.email}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    E-mail
                  </a>
                ) : null}
              </div>

              <div className="mt-3 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <div className="font-semibold text-gray-800">Observações</div>
                <div className="mt-1 whitespace-pre-wrap">
                  {lead.clientNotes || lead.message || "Não informado"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Perfil de interesse</h2>
            <p className="text-[11px] text-gray-500">Preferências e contexto do que o cliente procura.</p>

            <div className="mt-3 divide-y divide-gray-100">
              <InfoRow label="Tipo(s)" value={lead.property?.type ? String(lead.property.type) : "Não informado"} />
              <InfoRow
                label="Localização"
                value={
                  lead.property
                    ? `${lead.property.city}/${lead.property.state}${lead.property.neighborhood ? ` • ${lead.property.neighborhood}` : ""}`
                    : "Não informado"
                }
              />
              <InfoRow label="Finalidade" value={formatPurpose(lead.property?.purpose)} />
              <InfoRow label="Valor do imóvel" value={formatPrice(lead.property?.price)} />
              <InfoRow
                label="Características"
                value={
                  lead.property
                    ? [
                        lead.property.bedrooms ? `${lead.property.bedrooms} dorm` : null,
                        lead.property.bathrooms ? `${lead.property.bathrooms} banh` : null,
                        lead.property.areaM2 ? `${lead.property.areaM2}m²` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ") || "Não informado"
                    : "Não informado"
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Resumo</h2>
            <p className="text-[11px] text-gray-500">Status e informações do atendimento.</p>

            <div className="mt-3 divide-y divide-gray-100">
              <InfoRow label="Etapa" value={lead.pipelineStage || "Não informado"} />
              <InfoRow label="Status" value={lead.status ? String(lead.status) : "Não informado"} />
              <InfoRow label="Origem do lead" value={getLeadOriginLabel(lead)} />
              <InfoRow label="Criado" value={formatDateTime(lead.createdAt)} />
              <InfoRow label="Última msg do cliente" value={formatDateTime(lead.pendingReplyAt)} />
              <InfoRow label="Responsável" value={lead.realtor?.name || "Não informado"} />
              <InfoRow
                label="Visita"
                value={
                  lead.visitDate || lead.visitTime
                    ? `${lead.visitDate ? new Date(lead.visitDate).toLocaleDateString("pt-BR") : ""}${
                        lead.visitTime ? ` • ${lead.visitTime}` : ""
                      }`.trim() || "Não informado"
                    : "Não informado"
                }
              />
            </div>

            {lead.clientChatToken ? (
              <div className="mt-3 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <div className="font-semibold text-gray-800">Link do chat do cliente</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getClientChatUrl(lead.clientChatToken)}
                    className="flex-1 px-2 py-1 rounded border border-gray-200 bg-white text-[11px] text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard("Chat", getClientChatUrl(lead.clientChatToken as string))}
                    className="px-2 py-1 rounded bg-gray-900 text-white text-[11px] font-semibold"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
