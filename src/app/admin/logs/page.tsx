"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Activity, AlertCircle, Info, CheckCircle } from "lucide-react";
import Link from "next/link";

interface Log {
  id: string;
  level: string;
  message: string;
  metadata: any;
  createdAt: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/logs");
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    return levelFilter === "ALL" || log.level === levelFilter;
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
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
          <div className="flex gap-4">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Todos os Níveis</option>
              <option value="ERROR">Erros</option>
              <option value="WARN">Avisos</option>
              <option value="INFO">Informações</option>
              <option value="SUCCESS">Sucesso</option>
            </select>
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
                      <p className="text-gray-900 font-medium mb-2">
                        {log.message}
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
