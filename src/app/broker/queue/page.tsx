"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Clock, Award, Activity, RefreshCw } from "lucide-react";
import ScoreBadge from "@/components/queue/ScoreBadge";

interface QueuePosition {
  id: string;
  position: number;
  actualPosition: number;
  score: number;
  status: string;
  activeLeads: number;
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

interface QueueStats {
  total: number;
  active: number;
  avgScore: number;
  avgWaitTime: number;
}

interface ScoreHistoryItem {
  id: string;
  action: string;
  points: number;
  description: string | null;
  createdAt: string;
}

export default function QueuePage() {
  const [position, setPosition] = useState<QueuePosition | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [positionRes, statsRes] = await Promise.all([
        fetch("/api/broker/queue/position"),
        fetch("/api/broker/queue/stats"),
      ]);

      if (positionRes.ok) {
        const positionData = await positionRes.json();
        setPosition(positionData);
      } else if (positionRes.status === 404) {
        setPosition(null);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching queue data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueue = async () => {
    try {
      const response = await fetch("/api/broker/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        alert("Você entrou na fila!");
        fetchData();
      } else {
        alert("Erro ao entrar na fila");
      }
    } catch (error) {
      console.error("Error joining queue:", error);
      alert("Erro ao entrar na fila");
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="bg-gray-50 flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 glass-teal rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Você não está na fila
          </h2>
          <p className="text-gray-600 mb-6">
            Entre na fila para começar a receber leads automaticamente
          </p>
          <button
            onClick={handleJoinQueue}
            className="px-6 py-3 glass-teal text-white font-medium rounded-lg transition-colors"
          >
            Entrar na Fila
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Minha Fila</h1>
              <p className="text-gray-600 mt-1">
                Acompanhe sua posição e desempenho
              </p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 glass-teal text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Position Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium mb-2">
                Sua posição na fila
              </p>
              <h2 className="text-6xl font-bold mb-4">
                #{position.actualPosition}
              </h2>
              <p className="text-white/80">
                {position.actualPosition === 1
                  ? "Você é o próximo!"
                  : `${position.actualPosition - 1} ${
                      position.actualPosition - 1 === 1
                        ? "corretor"
                        : "corretores"
                    } na sua frente`}
              </p>
            </div>
            <div className="text-right">
              <ScoreBadge score={position.score} size="lg" />
              <p className="text-white/80 text-sm mt-2">Pontuação total</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Leads Aceitos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {position.totalAccepted}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Leads Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {position.activeLeads}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-orange-50 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Tempo Médio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {position.avgResponseTime || 0}min
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 glass-teal rounded-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Taxa de Aceitação</p>
                <p className="text-2xl font-bold text-gray-900">
                  {position.totalAccepted + position.totalRejected > 0
                    ? Math.round(
                        (position.totalAccepted /
                          (position.totalAccepted + position.totalRejected)) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Stats */}
        {stats && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Estatísticas da Fila
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total de Corretores</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Corretores Ativos</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Score Médio</p>
                <p className="text-3xl font-bold text-blue-600">{stats.avgScore}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Tempo Médio de Espera</p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats.avgWaitTime}min
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">
            💡 Dicas para melhorar sua posição
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Aceite leads rapidamente (menos de 5 minutos) para ganhar +5 pontos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Evite recusar leads para não perder pontos (-5 por recusa)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Complete visitas agendadas para ganhar +10 pontos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Receba boas avaliações dos clientes para ganhar até +15 pontos</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
