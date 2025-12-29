"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Send } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  data?: any;
  createdAt: string;
};

type SuggestedAction = {
  type?: "DRAFT_MESSAGE" | "SET_REMINDER" | "PROPERTY_DIAGNOSIS" | "LISTING_IMPROVEMENT";
  title: string;
  impact: string;
  requiresConfirmation?: boolean;
  payload?: any;
};

async function copyText(text: string) {
  const value = String(text || "");
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      el.style.top = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    } catch {
    }
  }
}

export default function RealtorAssistantChat(props: { leadId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const leadId = props.leadId;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scopeLabel = leadId ? "Lead" : "Geral";

  const loadHistory = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const qs = leadId ? `?leadId=${encodeURIComponent(leadId)}` : "";
      const res = await fetch(`/api/assistant/chat${qs}`);
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        const msg =
          json?.error ||
          (res.status === 401
            ? "Sua sessão expirou. Entre novamente e tente de novo."
            : res.status === 403
              ? "Você não tem permissão para usar este chat."
              : "Não conseguimos carregar o chat agora.");
        throw new Error(msg);
      }

      const list = Array.isArray(json?.data?.messages) ? (json.data.messages as any[]) : [];
      const normalized = list
        .map((m) => ({
          id: String(m.id),
          role: String(m.role || "SYSTEM") as any,
          content: String(m.content || ""),
          data: m.data ?? null,
          createdAt: String(m.createdAt || new Date().toISOString()),
        }))
        .filter((m) => m.content.trim().length > 0);

      setMessages(normalized);
    } catch (err: any) {
      setError(err?.message || "Não conseguimos carregar o chat agora.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content) return;

    setSending(true);
    setError(null);

    const optimisticId = `tmp_${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: "USER",
      content,
      data: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: leadId || null, content }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        const msg =
          json?.error ||
          (res.status === 401
            ? "Sua sessão expirou. Entre novamente e tente de novo."
            : res.status === 403
              ? "Você não tem permissão para usar este chat."
              : "Não conseguimos enviar sua mensagem agora.");
        throw new Error(msg);
      }

      const newMessages = Array.isArray(json?.data?.messages) ? (json.data.messages as any[]) : [];
      const normalized = newMessages
        .map((m) => ({
          id: String(m.id),
          role: String(m.role || "SYSTEM") as any,
          content: String(m.content || ""),
          data: m.data ?? null,
          createdAt: String(m.createdAt || new Date().toISOString()),
        }))
        .filter((m) => m.content.trim().length > 0);

      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticId);
        return [...withoutOptimistic, ...normalized];
      });
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(content);
      setError(err?.message || "Não conseguimos enviar sua mensagem agora.");
    } finally {
      setSending(false);
    }
  }, [input, leadId]);

  const suggestionBlocks = useMemo(() => {
    const blocks: Array<{ messageId: string; actions: SuggestedAction[] }> = [];

    for (const m of messages) {
      if (m.role !== "ASSISTANT") continue;
      const actionsRaw = m.data?.suggestedActions;
      if (!Array.isArray(actionsRaw) || actionsRaw.length === 0) continue;
      const actions = actionsRaw
        .map((a: any) => {
          if (!a || typeof a !== "object") return null;
          const title = String(a.title || "").trim();
          const impact = String(a.impact || "").trim();
          if (!title || !impact) return null;
          return {
            type: a.type,
            title,
            impact,
            requiresConfirmation: true,
            payload: a.payload,
          } as SuggestedAction;
        })
        .filter(Boolean) as SuggestedAction[];

      if (actions.length) {
        blocks.push({ messageId: m.id, actions: actions.slice(0, 6) });
      }
    }

    return blocks;
  }, [messages]);

  const executeReminderAction = useCallback(
    async (action: SuggestedAction) => {
      const targetLeadId = String((action.payload as any)?.leadId || leadId || "").trim();
      if (!targetLeadId) {
        toast.error("Ação indisponível", "Este lembrete precisa estar vinculado a um lead.");
        return;
      }

      const dateRaw = (action.payload as any)?.date;
      const noteRaw = (action.payload as any)?.note;

      const date = dateRaw == null ? null : String(dateRaw);
      const note = noteRaw == null ? null : String(noteRaw);

      const ok = await toast.confirm({
        title: "Confirmar ação",
        message: `Criar lembrete para este lead?\n\n${action.title}`,
        confirmText: "Criar lembrete",
        cancelText: "Cancelar",
        variant: "info",
      });

      if (!ok) return;

      try {
        const res = await fetch(`/api/leads/${encodeURIComponent(targetLeadId)}/reminder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, note }),
        });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.success) {
          const msg =
            json?.error ||
            (res.status === 401
              ? "Sua sessão expirou. Entre novamente e tente de novo."
              : res.status === 403
                ? "Você não tem permissão para criar lembretes neste lead."
                : "Não conseguimos criar este lembrete agora.");
          throw new Error(msg);
        }

        toast.success("Lembrete criado", "Próxima ação salva no lead.");
      } catch (err: any) {
        toast.error("Erro", err?.message || "Não conseguimos criar este lembrete agora.");
      }
    },
    [leadId, toast]
  );

  const openDraftInClientChat = useCallback(
    async (action: SuggestedAction) => {
      const targetLeadId = String((action.payload as any)?.leadId || leadId || "").trim();
      const content = String((action.payload as any)?.content || "").trim();

      if (!targetLeadId || !content) {
        toast.error("Ação indisponível", "Este rascunho precisa estar vinculado a um lead e ter texto.");
        return;
      }

      const ok = await toast.confirm({
        title: "Abrir chat do cliente",
        message: "Vou abrir o chat do cliente com o rascunho pré-preenchido. Você ainda precisará clicar em enviar.",
        confirmText: "Abrir",
        cancelText: "Cancelar",
        variant: "info",
      });
      if (!ok) return;

      router.push(`/broker/chats?lead=${encodeURIComponent(targetLeadId)}&draft=${encodeURIComponent(content)}`);
    },
    [leadId, router, toast]
  );

  const openPropertyAction = useCallback(
    async (action: SuggestedAction) => {
      const propertyId = String((action.payload as any)?.propertyId || "").trim();

      const ok = await toast.confirm({
        title: "Abrir imóvel",
        message: "Vou abrir a tela do imóvel para você analisar. Nenhuma alteração será feita automaticamente.",
        confirmText: "Abrir",
        cancelText: "Cancelar",
        variant: "info",
      });
      if (!ok) return;

      if (propertyId) {
        router.push(`/broker/properties/${encodeURIComponent(propertyId)}/overview`);
        return;
      }

      router.push("/broker/properties");
    },
    [router, toast]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) void send();
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-gray-700">Chat IA ({scopeLabel})</p>
        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-60"
        >
          Atualizar
        </button>
      </div>

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
      {loading && <p className="mt-2 text-[11px] text-gray-500">Carregando...</p>}

      <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
        {messages.length === 0 && !loading ? (
          <div className="text-[11px] text-gray-600">
            Me diga o que você quer fazer. Ex.: &quot;Quais leads eu devo priorizar hoje?&quot; ou &quot;Crie um follow-up para este lead&quot;.
          </div>
        ) : (
          <div className="space-y-3">
            {messages
              .filter((m) => m.role !== "SYSTEM")
              .map((m) => {
                const isUser = m.role === "USER";
                const wrapper = isUser ? "flex justify-end" : "flex justify-start";
                const bubble = isUser
                  ? "max-w-[85%] rounded-2xl bg-white border border-gray-200 px-3 py-2"
                  : "max-w-[85%] rounded-2xl bg-white border border-gray-200 px-3 py-2";

                const actionBlock = suggestionBlocks.find((b) => b.messageId === m.id);

                return (
                  <div key={m.id} className={wrapper}>
                    <div className={bubble}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold text-gray-700">{isUser ? "Você" : "IA"}</p>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => copyText(m.content)}
                            className="p-1 rounded-lg hover:bg-gray-100 text-gray-600"
                            title="Copiar"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-800 whitespace-pre-wrap">{m.content}</div>

                      {actionBlock && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] font-semibold text-gray-700">Sugestões (rascunho)</p>
                          {actionBlock.actions.map((a, idx) => (
                            <div key={`${m.id}-a-${idx}`} className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                              <div className="text-[11px] font-semibold text-gray-900">{a.title}</div>
                              <div className="mt-1 text-[11px] text-gray-600">{a.impact}</div>
                              {a.type === "DRAFT_MESSAGE" && a.payload?.content && (
                                <div className="mt-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => copyText(String(a.payload?.content || ""))}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-800 hover:bg-gray-50"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      Copiar rascunho
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void openDraftInClientChat(a)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-900 text-white text-[11px] font-semibold hover:bg-gray-800"
                                    >
                                      Abrir chat
                                    </button>
                                  </div>
                                </div>
                              )}

                              {a.type === "SET_REMINDER" && (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => void executeReminderAction(a)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-900 text-white text-[11px] font-semibold hover:bg-gray-800"
                                  >
                                    Criar lembrete
                                  </button>
                                </div>
                              )}

                              {(a.type === "PROPERTY_DIAGNOSIS" || a.type === "LISTING_IMPROVEMENT") && (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => void openPropertyAction(a)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-900 text-white text-[11px] font-semibold hover:bg-gray-800"
                                  >
                                    Ver imóvel
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sending}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="Digite sua mensagem..."
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !input.trim()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white text-[11px] font-semibold disabled:opacity-60"
        >
          <Send className="w-3.5 h-3.5" />
          Enviar
        </button>
      </div>
    </div>
  );
}
