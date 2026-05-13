"use client";

import { useEffect, useState } from "react";

const CACHE_KEY = "oggahub_agency_identity_v1";

const AVATAR_GRADIENTS = [
  "from-teal-400 to-emerald-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
] as const;

function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AgencyIdentityBadge({ collapsed = false }: { collapsed?: boolean }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) setName(cached);
    } catch {
      // ignore
    }

    const load = async () => {
      try {
        const res = await fetch("/api/teams", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) return;
        const teams: Array<{ id: string; name: string }> = Array.isArray(data.teams) ? data.teams : [];
        const firstName = teams[0]?.name?.trim();
        if (!cancelled && firstName) {
          setName(firstName);
          try {
            sessionStorage.setItem(CACHE_KEY, firstName);
          } catch {
            // ignore
          }
        }
      } catch {
        // silent
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!name) return null;

  const initials = initialsOf(name);
  const gradient = gradientFor(name);

  return (
    <div className="mb-3 flex items-center gap-2.5 px-1">
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-xs font-bold text-white shadow-sm`}
        title={name}
      >
        {initials}
      </span>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Imobiliária</p>
          <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
        </div>
      ) : null}
    </div>
  );
}
