"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, CalendarClock, ClipboardList, MoreHorizontal, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import RealtorAssistantFeed from "@/components/crm/RealtorAssistantFeed";
import { getPusherClient } from "@/lib/pusher-client";

type CategoryKey = "ALL" | "Leads" | "Visitas" | "Lembretes" | "Outros";

type Counts = {
  ALL: number;
  Leads: number;
  Visitas: number;
  Lembretes: number;
  Outros: number;
};

export default function BrokerAssistantPage() {
  const { data: session, status } = useSession();
  const role = (session as any)?.user?.role || (session as any)?.role;
  const realtorId = (session as any)?.user?.id || (session as any)?.userId || "";

  const [category, setCategory] = useState<CategoryKey>("ALL");
  const [query, setQuery] = useState<string>("");
  const [priority, setPriority] = useState<"" | "LOW" | "MEDIUM" | "HIGH">("");
  const [includeSnoozed, setIncludeSnoozed] = useState(true);
  const [counts, setCounts] = useState<Counts>({
    ALL: 0,
    Leads: 0,
    Visitas: 0,
    Lembretes: 0,
    Outros: 0,
  });
  const statsEtagRef = useRef<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!realtorId) return;
    try {
      const response = await fetch(
        "/api/assistant/stats",
        statsEtagRef.current ? { headers: { "if-none-match": statsEtagRef.current } } : undefined
      );

      if (response.status === 304) return;

      const etag = response.headers.get("etag");
      if (etag) statsEtagRef.current = etag;

      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success || !json?.counts) {
        return;
      }

      const next = json.counts as Counts;
      setCounts({
        ALL: Number(next.ALL || 0),
        Leads: Number(next.Leads || 0),
        Visitas: Number(next.Visitas || 0),
        Lembretes: Number(next.Lembretes || 0),
        Outros: Number(next.Outros || 0),
      });
    } catch {
    }
  }, [realtorId]);

  const navItems = useMemo(() => {
    return [
      { key: "ALL" as const, label: "Inbox", icon: ClipboardList, count: counts.ALL },
      { key: "Leads" as const, label: "Leads", icon: Users, count: counts.Leads },
      { key: "Visitas" as const, label: "Visitas", icon: CalendarClock, count: counts.Visitas },
      { key: "Lembretes" as const, label: "Lembretes", icon: Bell, count: counts.Lembretes },
      { key: "Outros" as const, label: "Outros", icon: MoreHorizontal, count: counts.Outros },
    ];
  }, [counts]);

  const canAccess = role === "REALTOR" || role === "AGENCY" || role === "ADMIN";

  useEffect(() => {
    if (!realtorId || !canAccess) return;
    fetchStats();

    let cancelled = false;
    let interval: any;
    interval = setInterval(() => {
      if (cancelled) return;
      fetchStats();
    }, 180000);

    try {
      const pusher = getPusherClient();
      const channelName = `private-realtor-${realtorId}`;
      const channel = pusher.subscribe(channelName);
      const handler = () => {
        if (cancelled) return;
        fetchStats();
      };
      channel.bind("assistant-updated", handler as any);

      return () => {
        cancelled = true;
        clearInterval(interval);
        try {
          channel.unbind("assistant-updated", handler as any);
          pusher.unsubscribe(channelName);
        } catch {
        }
      };
    } catch {
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
  }, [realtorId, canAccess, fetchStats]);

  return (
    <DashboardLayout
      title="Assistente"
      description="Organize suas pendências por categoria e mantenha o controle do dia a dia."
      breadcrumbs={[
        { label: "Painel", href: "/broker/dashboard" },
        { label: "Assistente" },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {status === "loading" && <CenteredSpinner />}

        {status !== "loading" && (!realtorId || !canAccess) && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-semibold text-gray-900">Acesso negado</p>
            <p className="mt-1 text-sm text-gray-600">Faça login como corretor para acessar o Assistente.</p>
          </div>
        )}

        {status !== "loading" && realtorId && canAccess && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            <aside className="lg:sticky lg:top-28 h-fit">
              <div className="rounded-3xl border border-gray-200/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-4">
                <p className="text-[12px] font-extrabold text-gray-900">Categorias</p>
                <div className="mt-3 space-y-1">
                  {navItems.map((it) => {
                    const active = it.key === category;
                    const Icon = it.icon;
                    return (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => setCategory(it.key)}
                        className={
                          active
                            ? "w-full flex items-center justify-between rounded-2xl px-3 py-2 bg-gray-900 text-white"
                            : "w-full flex items-center justify-between rounded-2xl px-3 py-2 text-gray-900 hover:bg-gray-50"
                        }
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={
                              active
                                ? "inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/10"
                                : "inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 border border-gray-200"
                            }
                          >
                            <Icon className={active ? "w-4.5 h-4.5" : "w-4.5 h-4.5 text-gray-700"} />
                          </span>
                          <span className={active ? "text-sm font-bold" : "text-sm font-semibold"}>{it.label}</span>
                        </span>
                        <span
                          className={
                            active
                              ? "min-w-[28px] h-7 px-2 rounded-full bg-white/15 text-white text-xs font-bold flex items-center justify-center"
                              : "min-w-[28px] h-7 px-2 rounded-full bg-gray-100 text-gray-800 text-xs font-bold flex items-center justify-center"
                          }
                        >
                          {it.count > 99 ? "99+" : it.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
                  <p className="text-[11px] font-semibold text-gray-900">Dica</p>
                  <p className="mt-1 text-[11px] text-gray-700">
                    Use as categorias para focar em um tipo de pendência por vez e manter o feed limpo.
                  </p>
                </div>
              </div>
            </aside>

            <section className="min-w-0">
              <div className="rounded-3xl border border-gray-200/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900 truncate">
                      {category === "ALL" ? "Inbox" : category}
                    </p>
                    <p className="mt-0.5 text-[12px] font-semibold text-gray-600">
                      {category === "ALL"
                        ? `${counts.ALL} pendência${counts.ALL === 1 ? "" : "s"}`
                        : `${counts[category]} pendência${counts[category] === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por título ou mensagem..."
                      className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={priority}
                      onChange={(e) => setPriority((e.target.value || "") as any)}
                      className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      aria-label="Prioridade"
                    >
                      <option value="">Todas</option>
                      <option value="HIGH">Alta</option>
                      <option value="MEDIUM">Média</option>
                      <option value="LOW">Baixa</option>
                    </select>

                    <label className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900">
                      <input
                        type="checkbox"
                        checked={includeSnoozed}
                        onChange={(e) => setIncludeSnoozed(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Snoozed
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <RealtorAssistantFeed
                    realtorId={realtorId}
                    embedded
                    categoryFilter={category}
                    query={query}
                    priority={priority}
                    includeSnoozed={includeSnoozed}
                    showCategoryHeadings={category === "ALL"}
                    showChatTab={false}
                    limit={200}
                    onDidMutate={() => {
                      statsEtagRef.current = null;
                      fetchStats();
                    }}
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
