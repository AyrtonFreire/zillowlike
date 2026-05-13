"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Clock } from "lucide-react";

export default function AssistantTabs() {
  const pathname = usePathname() || "";
  const isOffline = pathname.startsWith("/broker/assistant/offline");

  return (
    <div className="mb-4 inline-flex items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
      <Link
        href="/broker/assistant"
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
          !isOffline
            ? "bg-slate-900 text-white shadow-sm"
            : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Bell className="h-4 w-4" />
        Pendências
      </Link>
      <Link
        href="/broker/assistant/offline"
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
          isOffline ? "bg-slate-900 text-white shadow-sm" : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Clock className="h-4 w-4" />
        Auto-resposta
      </Link>
    </div>
  );
}
