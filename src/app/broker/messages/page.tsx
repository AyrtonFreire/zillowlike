"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import EmptyState from "@/components/ui/EmptyState";

interface Conversation {
  leadId: string;
  leadStatus: string | null;
  propertyId: string | null;
  propertyTitle: string;
  propertyCity: string | null;
  propertyState: string | null;
  contactName: string | null;
  contactPhone: string | null;
  lastMessageId: string;
  lastMessageContent: string;
  lastMessageCreatedAt: string;
  lastMessageSenderId: string | null;
  lastMessageSenderName: string | null;
  lastMessageSenderRole: string | null;
  lastMessageFromClient?: boolean;
}

const STORAGE_PREFIX = "zlw_inbox_last_read_";

function formatDateTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return d.toISOString();
  }
}

export default function BrokerMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        setError(null);
        setLoading(true);
        const response = await fetch("/api/broker/messages/inbox");
        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(
            data?.error || "Não conseguimos carregar sua caixa de mensagens agora. Tente novamente em alguns instantes."
          );
        }

        const list: Conversation[] = Array.isArray(data.conversations) ? data.conversations : [];
        setConversations(list);

        // Calcula quais conversas estão "novas" baseado em localStorage
        try {
          if (typeof window === "undefined") return;
          const map: Record<string, boolean> = {};
          for (const conv of list) {
            const key = `${STORAGE_PREFIX}${conv.leadId}`;
            const stored = window.localStorage.getItem(key);
            if (!stored) {
              map[conv.leadId] = true;
              continue;
            }
            const lastRead = new Date(stored).getTime();
            const lastMsg = new Date(conv.lastMessageCreatedAt).getTime();
            map[conv.leadId] = Number.isNaN(lastRead) || lastMsg > lastRead;
          }
          setUnreadMap(map);
        } catch {
          // ignora erros de storage
        }
      } catch (err: any) {
        console.error("Error fetching broker inbox:", err);
        setError(
          err?.message ||
            "Não conseguimos carregar sua caixa de mensagens agora. Se quiser, tente novamente em alguns instantes."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInbox();
  }, []);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const term = search.trim().toLowerCase();
    return conversations.filter((c) => {
      return (
        c.propertyTitle.toLowerCase().includes(term) ||
        (c.propertyCity && c.propertyCity.toLowerCase().includes(term)) ||
        (c.contactName && c.contactName.toLowerCase().includes(term))
      );
    });
  }, [conversations, search]);

  const handleOpenConversation = (conv: Conversation) => {
    try {
      if (typeof window === "undefined") return;
      const key = `${STORAGE_PREFIX}${conv.leadId}`;
      window.localStorage.setItem(key, conv.lastMessageCreatedAt);
      setUnreadMap((prev) => ({ ...prev, [conv.leadId]: false }));
    } catch {
      // ignore storage errors
    }
  };

  const content = () => {
    if (loading) {
      return (
        <div className="py-16">
          <CenteredSpinner message="Carregando mensagens..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-12">
          <EmptyState
            title="Não conseguimos carregar suas mensagens"
            description={error}
            action={
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-neutral-900 text-white hover:bg-black"
              >
                Tentar novamente
              </button>
            }
          />
        </div>
      );
    }

    if (filteredConversations.length === 0) {
      return (
        <div className="py-12">
          <EmptyState
            title="Nenhuma conversa encontrada"
            description={
              conversations.length === 0
                ? "Assim que você começar a registrar mensagens internas nos leads, elas aparecerão aqui."
                : "Nenhuma conversa corresponde à sua busca. Tente ajustar o termo ou limpar o filtro."
            }
          />
        </div>
      );
    }

    return (
      <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-100">
        {filteredConversations.map((conv) => {
          const unread = unreadMap[conv.leadId];
          const subtitleParts: string[] = [];
          if (conv.propertyCity) {
            subtitleParts.push(conv.propertyCity + (conv.propertyState ? `, ${conv.propertyState}` : ""));
          }
          if (conv.contactName) {
            subtitleParts.push(conv.contactName);
          }

          return (
            <Link
              key={conv.leadId}
              href={`/broker/leads/${conv.leadId}`}
              onClick={() => handleOpenConversation(conv)}
              className={`flex items-start gap-4 px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors ${
                unread ? "bg-blue-50/60" : "bg-white"
              }`}
            >
              <div className="mt-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border text-xs font-semibold ${
                    unread
                      ? "border-blue-500 text-blue-700 bg-blue-50"
                      : "border-gray-200 text-gray-500 bg-gray-50"
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {conv.propertyTitle}
                    </p>
                    {subtitleParts.length > 0 && (
                      <p className="mt-0.5 text-xs text-gray-500 truncate">{subtitleParts.join(" • ")}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[11px] text-gray-500 whitespace-nowrap">
                      {formatDateTime(conv.lastMessageCreatedAt)}
                    </span>
                    {unread && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500 text-[10px] font-semibold text-white">
                        Novo
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                  {conv.lastMessageContent}
                </p>

                {(conv.lastMessageSenderName || conv.lastMessageFromClient) && (
                  <p className="mt-1 text-[11px] text-gray-400">
                    De: {conv.lastMessageFromClient ? "Cliente" : conv.lastMessageSenderName}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout
      title="Mensagens"
      description="Veja, em um só lugar, as conversas internas relacionadas aos seus leads."
      breadcrumbs={[
        { label: "Painel do corretor", href: "/broker/dashboard" },
        { label: "Mensagens" },
      ]}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600 max-w-xl">
              Aqui você vê, de forma simples, os leads em que houve troca de mensagens internas recentemente. Use esta página
              como um atalho para continuar atendimentos em andamento.
            </p>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por imóvel, cidade ou contato"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>
        </div>

        {content()}
      </div>
    </DashboardLayout>
  );
}
