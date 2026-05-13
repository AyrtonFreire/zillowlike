"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const TEAM_NAME_CACHE_KEY = "oggahub_broker_team_v1";

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
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function BrokerIdentityBadge() {
  const { data: session } = useSession();
  const [teamName, setTeamName] = useState<string | null>(null);

  const displayName = session?.user?.name?.trim() || session?.user?.email?.split("@")[0] || "Corretor";
  const initials = initialsOf(displayName);
  const gradient = gradientFor(displayName);

  useEffect(() => {
    let cancelled = false;
    try {
      const cached = sessionStorage.getItem(TEAM_NAME_CACHE_KEY);
      if (cached) setTeamName(cached);
    } catch {
      // ignore
    }
    (async () => {
      try {
        const res = await fetch("/api/teams", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) return;
        const teams: Array<{ name?: string }> = Array.isArray(data.teams) ? data.teams : [];
        const name = teams[0]?.name?.trim();
        if (!cancelled) {
          if (name) {
            setTeamName(name);
            try {
              sessionStorage.setItem(TEAM_NAME_CACHE_KEY, name);
            } catch {
              // ignore
            }
          } else {
            try {
              sessionStorage.removeItem(TEAM_NAME_CACHE_KEY);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/profile?onboarding=broker"
      className="mb-3 flex items-center gap-2.5 rounded-2xl border border-transparent px-1.5 py-1.5 transition hover:border-gray-200 hover:bg-white"
      title="Acessar perfil profissional"
    >
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm ring-1 ring-white/40`}
        aria-hidden="true"
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-950">{displayName}</p>
        <p className="truncate text-[11px] text-gray-500">
          {teamName ? <>Em <span className="font-medium text-gray-700">{teamName}</span></> : "Toque para abrir o perfil"}
        </p>
      </div>
    </Link>
  );
}
