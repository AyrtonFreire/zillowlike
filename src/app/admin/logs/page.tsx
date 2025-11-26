"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Activity, AlertCircle, Info, CheckCircle } from "lucide-react";
import Link from "next/link";
import { ModernNavbar } from "@/components/modern";

interface Log {
  id: string;
  level: string;
  action: string;
  message: string;
  metadata: any;
  actorEmail?: string | null;
  actorRole?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  createdAt: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const exportParams = new URLSearchParams();
  exportParams.set("days", String(days));
  if (levelFilter !== "ALL") {
    exportParams.set("level", levelFilter.toUpperCase());
  }
  if (actionFilter !== "ALL") {
    exportParams.set("action", actionFilter);
  }
  if (search.trim()) {
    exportParams.set("q", search.trim());
  }
  const exportUrl = `/api/admin/logs/export?${exportParams.toString()}`;

  useEffect(() => {
    fetchLogs();
  }, [days, levelFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("days", String(days));
      if (levelFilter !== "ALL") {
        params.set("level", levelFilter.toUpperCase());
      }
      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(Array.isArray(data.logs) ? data.logs : []);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const actionOptions = Array.from(
    new Set(logs.map((log) => log.action).filter((a) => typeof a === "string" && a.length > 0)),
  );

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== "ALL" && log.level !== levelFilter) {
      return false;
    }
    if (actionFilter !== "ALL" && log.action !== actionFilter) {
      return false;
    }
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      const haystack = [
        log.message || "",
        log.action || "",
        log.actorEmail || "",
        log.targetId || "",
        log.targetType || "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "ERROR":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "WARN":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "INFO":
        return <Info className="w-5 h-5 text-blue-600" />;
      case "SUCCESS":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const styles = {
      ERROR: "bg-red-100 text-red-700",
      WARN: "bg-yellow-100 text-yellow-700",
      INFO: "bg-blue-100 text-blue-700",
      SUCCESS: "bg-green-100 text-green-700",
    };
    return styles[level as keyof typeof styles] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar />
      {/* Header */}
      <div className="bg-white border-b border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Logs do Sistema
              </h1>
              <p className="text-gray-600 mt-1">
                {filteredLogs.length} registros encontrados
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Período:</span>
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d as 7 | 30 | 90)}
                    className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                      days === d
                        ? "bg-teal-50 border-teal-300 text-teal-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Nível:</span>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">Todos</option>
                  <option value="ERROR">Erros</option>
                  <option value="WARN">Avisos</option>
                  <option value="INFO">Informações</option>
                  <option value="SUCCESS">Sucesso</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Ação:</span>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs max-w-[220px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">Todas</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1 flex justify-end gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por mensagem, ação, usuário ou alvo"
                className="w-full md:max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <a
                href={exportUrl}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors text-xs md:text-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M4 4h16v4" />
                  <path d="M9 12l3 3 3-3" />
                  <path d="M12 3v12" />
                  <path d="M4 20h16" />
                </svg>
                <span>Exportar CSV</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="divide-y divide-gray-200">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getLevelIcon(log.level)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getLevelBadge(
                            log.level
                          )}`}
                        >
                          {log.level}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mb-1">
                        {log.message || log.action}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        Ação: <span className="font-mono">{log.action}</span>
                        {log.actorEmail && (
                          <>
                            {" "}· Admin: <span className="font-mono">{log.actorEmail}</span>
                          </>
                        )}
                        {log.targetType && (
                          <>
                            {" "}· Alvo: <span className="font-mono">{log.targetType}</span>
                            {log.targetId ? ` (${log.targetId})` : ""}
                          </>
                        )}
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                            Ver detalhes
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-50 rounded-lg overflow-x-auto text-xs">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum log encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
