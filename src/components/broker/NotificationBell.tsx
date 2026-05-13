"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, MessageCircle, Sparkles } from "lucide-react";

interface NotificationBellProps {
  unreadChats: number;
  assistantOpen: number;
}

export default function NotificationBell({ unreadChats, assistantOpen }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const total = (unreadChats || 0) + (assistantOpen || 0);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2"
      >
        <Bell className="h-4 w-4" />
        {total > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-40 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-950">Notificações</p>
            <p className="text-xs text-gray-500">Últimas atividades do seu painel</p>
          </div>
          <div className="divide-y divide-gray-100">
            {unreadChats > 0 ? (
              <Link
                href="/broker/chats"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {unreadChats} {unreadChats === 1 ? "conversa não lida" : "conversas não lidas"}
                  </p>
                  <p className="text-xs text-gray-500">Toque para ver e responder</p>
                </div>
              </Link>
            ) : null}
            {assistantOpen > 0 ? (
              <Link
                href="/broker/assistant"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {assistantOpen} {assistantOpen === 1 ? "tarefa do Assistente" : "tarefas do Assistente"}
                  </p>
                  <p className="text-xs text-gray-500">Pendências para você revisar</p>
                </div>
              </Link>
            ) : null}
            {total === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-medium text-gray-700">Tudo em dia 👌</p>
                <p className="mt-0.5 text-xs text-gray-500">Quando algo precisar de atenção, aparece aqui.</p>
              </div>
            ) : null}
          </div>
          <Link
            href="/broker/assistant"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            Ver tudo no Assistente
          </Link>
        </div>
      ) : null}
    </div>
  );
}
