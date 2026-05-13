"use client";

import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

type SnapshotMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
  activeLeads: number;
  pendingReply: number;
  stalledLeads?: number;
  wonLeads?: number;
  executionScore?: number;
};

interface AgencyTeamSnapshotProps {
  teamId: string;
  members: SnapshotMember[];
  initialLimit?: number;
}

const AVATAR_GRADIENTS = [
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-fuchsia-400 to-rose-500",
] as const;

function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function initialsOf(name: string | null, email: string | null): string {
  const raw = (name || email || "?").trim();
  if (!raw || raw === "?") return "?";
  const parts = raw.split(/\s+/).slice(0, 2);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

type Health = { label: string; dot: string; text: string; tone: string };

function healthFor(score: number | undefined, hasActivity: boolean): Health {
  if (!hasActivity) {
    return { label: "Sem atividade", dot: "bg-slate-300", text: "text-slate-600", tone: "border-slate-200 bg-slate-50" };
  }
  const s = typeof score === "number" ? score : 100;
  if (s >= 80) return { label: "Saudável", dot: "bg-emerald-500", text: "text-emerald-700", tone: "border-emerald-200 bg-emerald-50" };
  if (s >= 60) return { label: "Atenção", dot: "bg-amber-500", text: "text-amber-700", tone: "border-amber-200 bg-amber-50" };
  return { label: "Crítico", dot: "bg-rose-500", text: "text-rose-700", tone: "border-rose-200 bg-rose-50" };
}

import { useState } from "react";

export default function AgencyTeamSnapshot({ teamId, members, initialLimit = 6 }: AgencyTeamSnapshotProps) {
  const [showAll, setShowAll] = useState(false);

  if (!members || members.length === 0) return null;

  const ordered = [...members].sort((a, b) => {
    const aPending = a.pendingReply || 0;
    const bPending = b.pendingReply || 0;
    if (aPending !== bPending) return bPending - aPending;
    return (b.activeLeads || 0) - (a.activeLeads || 0);
  });

  const visible = showAll ? ordered : ordered.slice(0, initialLimit);
  const hiddenCount = ordered.length - visible.length;

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">Sua equipe agora</h2>
          <p className="mt-0.5 text-sm text-gray-600">Acompanhe a saúde de cada corretor e clique para ver o funil individual.</p>
        </div>
        <span className="inline-flex items-center self-start rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
          {members.length} {members.length === 1 ? "corretor" : "corretores"}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((member) => {
          const displayName = member.name?.trim() || member.email || "Corretor";
          const initials = initialsOf(member.name, member.email);
          const gradient = gradientFor(member.userId);
          const hasActivity = (member.activeLeads || 0) > 0 || (member.pendingReply || 0) > 0 || (member.wonLeads || 0) > 0;
          const health = healthFor(member.executionScore, hasActivity);
          const drillDownHref = `/agency/teams/${encodeURIComponent(teamId)}/crm?realtorId=${encodeURIComponent(member.userId)}`;

          return (
            <Link
              key={member.userId}
              href={drillDownHref}
              className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}>
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                  <p className="truncate text-[11px] text-gray-500">
                    {member.role === "OWNER" ? "Dono" : member.role === "ASSISTANT" ? "Assistente" : "Corretor"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${health.tone} ${health.text}`}
                  title={hasActivity ? `Score de execução: ${member.executionScore ?? "—"}/100` : "Ainda sem leads ativos"}
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${health.dot}`} />
                  {health.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5">
                <div className="text-center">
                  <div className="text-base font-bold tabular-nums text-slate-900">{member.activeLeads || 0}</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Ativos</div>
                </div>
                <div className="border-l border-slate-200 text-center">
                  <div className={`text-base font-bold tabular-nums ${(member.pendingReply || 0) > 0 ? "text-rose-700" : "text-slate-900"}`}>
                    {member.pendingReply || 0}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                    {(member.pendingReply || 0) > 0 ? <Clock3 className="h-2.5 w-2.5" /> : null}
                    Pendentes
                  </div>
                </div>
                <div className="border-l border-slate-200 text-center">
                  <div className="text-base font-bold tabular-nums text-emerald-700">{member.wonLeads || 0}</div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Ganhos</div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 group-hover:text-teal-800">
                Ver funil deste corretor
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>

      {hiddenCount > 0 ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Mostrar mais {hiddenCount}
          </button>
        </div>
      ) : null}
    </section>
  );
}
