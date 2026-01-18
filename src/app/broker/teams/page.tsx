"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageCircle, Plus, Users } from "lucide-react";
import CenteredSpinner from "@/components/ui/CenteredSpinner";

interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

interface Team {
  id: string;
  name: string;
  role: string; // Papel do usuário atual nesse time
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  };
  members: TeamMember[];
}

export default function BrokerTeamsPage() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role as string | undefined;

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchTeams();
  }, [status]);

  const fetchTeams = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch("/api/teams");
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos carregar seus times agora.");
      }

      setTeams(Array.isArray(data.teams) ? data.teams : []);
    } catch (err: any) {
      console.error("Error fetching teams:", err);
      setError(err?.message || "Não conseguimos carregar seus times agora.");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    const name = teamName.trim();
    if (!name) {
      setCreateError("Escolha um nome para o time antes de criar.");
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Não conseguimos criar este time agora.");
      }

      setTeams((prev) => [...prev, data.team]);
      setTeamName("");
    } catch (err: any) {
      console.error("Error creating team:", err);
      setCreateError(err?.message || "Não conseguimos criar este time agora.");
    } finally {
      setCreating(false);
    }
  };

  const mapRoleLabel = (role: string | undefined) => {
    switch (role) {
      case "OWNER":
        return "Responsável / dono do time";
      case "AGENT":
        return "Corretor(a) do time";
      case "ASSISTANT":
        return "Assistente";
      default:
        return role || "Membro";
    }
  };

  if (status === "loading" || loading) {
    return <CenteredSpinner message="Carregando seus times..." />;
  }

  const hasTeam = teams.length > 0;
  const canCreateTeam = userRole === "ADMIN" || (userRole === "REALTOR" && !hasTeam);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800">
            {error}
          </div>
        )}

        {canCreateTeam && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Criar um novo time</h2>
            <p className="text-xs text-gray-500 mb-4">
              Você pode usar um time para agrupar corretores e assistentes que trabalham juntos na mesma imobiliária ou equipe.
            </p>

            {createError && (
              <p className="text-xs text-red-600 mb-2">{createError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-700 mb-1">Nome do time</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex: Imobiliária Centro, Equipe Zona Sul..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateTeam}
                disabled={creating}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? "Criando..." : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar time
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Times dos quais você faz parte</h2>
          </div>

          {teams.length === 0 ? (
            <p className="text-xs text-gray-500">
              {canCreateTeam
                ? "No momento, você não tem times cadastrados. Quando fizer sentido, pode criar um time para organizar corretores e assistentes que trabalham juntos."
                : "No momento, você não está em nenhum time cadastrado. Se a sua imobiliária usar essa área, o responsável irá te adicionar automaticamente."}
            </p>
          ) : (
            <div className="space-y-3 text-xs text-gray-700">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/60"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{team.name}</p>
                      <p className="text-[11px] text-gray-500">{mapRoleLabel(team.role)}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="text-[11px] text-gray-500">
                        <span className="font-medium">Responsável:</span>{" "}
                        {team.owner.name || team.owner.email || "Sem nome"}
                      </div>
                      <Link
                        href={`/broker/teams/${team.id}/crm`}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                        Conversas
                      </Link>
                    </div>
                  </div>

                  {team.members.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {team.members.map((member) => (
                        <span
                          key={member.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-gray-200 text-[11px] text-gray-700"
                        >
                          <span className="font-medium">
                            {member.name || member.email || "Membro"}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase">
                            {mapRoleLabel(member.role)}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400">
          {canCreateTeam
            ? "Esta área de times ainda é simples e está em construção. Aos poucos, deve facilitar o compartilhamento de leads e a visão do funil da equipe."
            : "Esta área de times ainda é simples e está em construção. Por enquanto, serve para você enxergar os times dos quais faz parte."}
        </p>
    </div>
  );
}
