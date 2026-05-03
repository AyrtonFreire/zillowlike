"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/app/profile/components/ProfilePrimitives";

type NavTone = "neutral" | "success" | "warning" | "error" | "info";

export type AccountSettingsNavItem = {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  statusLabel?: string | null;
  statusTone?: NavTone;
};

function fallbackInitial(name?: string | null) {
  return (String(name || "C").trim().charAt(0) || "C").toUpperCase();
}

export function AccountSettingsSidebar({
  name,
  email,
  image,
  progress,
  items,
  activeId,
  onSelect,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  progress: { done: number; total: number; label: string };
  items: AccountSettingsNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const progressPercent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm shadow-black/5">
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-700 px-5 py-5 text-white">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
              {image ? (
                <Image src={image} alt={name || "Avatar"} fill sizes="56px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
                  {fallbackInitial(name)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold">{name || "Sua conta"}</div>
              <div className="truncate text-sm text-white/80">{email || "Sem e-mail principal"}</div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-white/85">Conta configurada</span>
              <span className="font-semibold text-white">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/15">
              <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-2 text-xs text-white/80">{progress.label}</div>
          </div>
        </div>

        <div className="p-3">
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Configurações</div>
          <nav className="space-y-1.5">
            {items.map((item) => {
              const active = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`group flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                    active
                      ? "border-teal-200 bg-teal-50 shadow-sm shadow-teal-900/5"
                      : "border-transparent bg-white hover:border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      active ? "bg-white text-teal-700 shadow-sm" : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-semibold ${active ? "text-teal-950" : "text-neutral-900"}`}>{item.label}</span>
                      {item.statusLabel ? <StatusBadge label={item.statusLabel} tone={item.statusTone || "neutral"} /> : null}
                    </div>
                    <p className={`mt-1 text-xs leading-5 ${active ? "text-teal-800/80" : "text-neutral-500"}`}>{item.description}</p>
                  </div>
                  <ChevronRight className={`mt-1 h-4 w-4 shrink-0 transition-transform ${active ? "text-teal-700" : "text-neutral-400 group-hover:translate-x-0.5"}`} />
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
