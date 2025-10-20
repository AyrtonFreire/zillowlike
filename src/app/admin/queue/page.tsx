"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Users, 
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  RefreshCw,
  TrendingUp,
  Award,
  Clock
} from "lucide-react";

interface RealtorQueue {
  id: string;
  realtorId: string;
  position: number;
  score: number;
  status: string;
  activeLeads: number;
  bonusLeads: number;
  totalAccepted: number;
  totalRejected: number;
  totalExpired: number;
  avgResponseTime: number | null;
  lastActivity: string;
  realtor: {
    name: string;
    email: string;
  };
}

export default function AdminQueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [queues, setQueues] = useState<RealtorQueue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const role = (session as any)?.user?.role;
    if (status === "authenticated" && role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/queue");
      const data = await res.json();
      if (data.success) {
        setQueues(data.queues);
      }
    } catch (error) {
      console.error("Error fetching queues:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchQueues();
    }
  }, [status]);

  const handleMoveUp = async (queueId: string) => {
    try {
      const res = await fetch("/api/admin/queue/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId, direction: "up" }),
      });
      if (res.ok) {
        fetchQueues();
      }
    } catch (error) {
      console.error("Error moving queue:", error);
    }
  };

  const handleMoveDown = async (queueId: string) => {
    try {
      const res = await fetch("/api/admin/queue/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId, direction: "down" }),
      });
      if (res.ok) {
        fetchQueues();
      }
    } catch (error) {
      console.error("Error moving queue:", error);
    }
  };

  const handleToggleStatus = async (queueId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const res = await fetch("/api/admin/queue/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId, status: newStatus }),
      });
      if (res.ok) {
        fetchQueues();
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando fila...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Controle da Fila de Corretores</h1>
              <p className="text-gray-600 mt-1">Gerencie a ordem e status dos corretores na fila</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchQueues}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Corretores</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{queues.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ativos</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {queues.filter(q => q.status === "ACTIVE").length}
                </p>
              </div>
              <Play className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inativos</p>
                <p className="text-3xl font-bold text-gray-600 mt-1">
                  {queues.filter(q => q.status === "INACTIVE").length}
                </p>
              </div>
              <Pause className="w-12 h-12 text-gray-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Leads Ativos Total</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {queues.reduce((sum, q) => sum + q.activeLeads, 0)}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Fila de Corretores</h2>
            <p className="text-sm text-gray-600 mt-1">Arraste ou use os botões para reordenar</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Corretor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads Ativos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aceitos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recusados</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tempo Resp.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {queues.map((queue, index) => (
                  <tr key={queue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">#{queue.position}</span>
                        {index === 0 && <Award className="w-5 h-5 text-yellow-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{queue.realtor.name}</p>
                        <p className="text-sm text-gray-500">{queue.realtor.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(queue.id, queue.status)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          queue.status === "ACTIVE" 
                            ? "bg-green-100 text-green-800 hover:bg-green-200" 
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                      >
                        {queue.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900 font-medium">{queue.score}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900 font-medium">{queue.activeLeads}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-green-600 font-medium">{queue.totalAccepted}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-red-600 font-medium">{queue.totalRejected}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {queue.avgResponseTime ? `${queue.avgResponseTime}min` : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMoveUp(queue.id)}
                          disabled={index === 0}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(queue.id)}
                          disabled={index === queues.length - 1}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
