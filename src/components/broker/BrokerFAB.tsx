"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Plus, Home, ClipboardList, MessageCircle, X } from "lucide-react";

interface FabAction {
  href: string;
  label: string;
  icon: typeof Home;
  tone: string;
}

const ACTIONS: FabAction[] = [
  { href: "/owner/new", label: "Novo imóvel", icon: Home, tone: "bg-teal-600 hover:bg-teal-700" },
  { href: "/broker/leads", label: "Ver leads", icon: ClipboardList, tone: "bg-violet-600 hover:bg-violet-700" },
  { href: "/broker/chats", label: "Conversas", icon: MessageCircle, tone: "bg-emerald-600 hover:bg-emerald-700" },
];

export default function BrokerFAB() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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
    <div
      ref={ref}
      className="fixed right-4 z-40 md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }}
    >
      {open ? (
        <div className="mb-3 flex flex-col items-end gap-2">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setOpen(false)}
                className={`inline-flex items-center gap-3 rounded-full ${action.tone} px-4 py-2.5 text-sm font-semibold text-white shadow-lg`}
              >
                {action.label}
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar ações rápidas" : "Abrir ações rápidas"}
        className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl ring-4 ring-white/20 transition ${
          open ? "bg-slate-900 hover:bg-slate-800" : "bg-teal-600 hover:bg-teal-700"
        }`}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
