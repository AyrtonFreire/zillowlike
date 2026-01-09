"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import CenteredSpinner from "@/components/ui/CenteredSpinner";
import { Users, Kanban } from "lucide-react";

type Team = {
  id: string;
  name: string;
  role: string;
};

export default function AgencyDashboardPage() {
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (role !== "AGENCY") return;

    const load = async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/teams");
        const j = await r.json().catch(() => null);
        const teams = Array.isArray(j?.teams) ? j.teams : [];
        setTeam(teams[0] || null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [role, status]);

  if (status === "loading" || loading) {
    return (
      <DashboardLayout
        title="Painel da Agência"
        description="Visão geral e próximos passos."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Agência" }]}
      >
        <CenteredSpinner message="Carregando painel..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Painel da Agência"
      description="Organize corretores, acompanhe leads e mantenha o funil em ordem."
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Agência" }]}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm font-semibold text-gray-900">Workspace</p>
          <p className="mt-1 text-sm text-gray-600">
            {team ? (
              <>
                <span className="font-medium text-gray-900">{team.name}</span>
                <span className="text-gray-500"> • </span>
                <span className="text-gray-500">{team.id}</span>
              </>
            ) : (
              "Não encontramos um time associado a esta agência ainda."
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/broker/teams"
            className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-gray-50 p-2 text-gray-700 group-hover:bg-gray-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Time</div>
                <div className="mt-1 text-sm text-gray-600">
                  Veja membros e acesse o CRM do time.
                </div>
              </div>
            </div>
          </Link>

          <Link
            href={team ? `/broker/teams/${team.id}/crm` : "/broker/teams"}
            className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-gray-50 p-2 text-gray-700 group-hover:bg-gray-100">
                <Kanban className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Funil (CRM)</div>
                <div className="mt-1 text-sm text-gray-600">
                  Acompanhe as etapas e gargalos do time.
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="text-sm font-semibold text-gray-900">Próximos passos (MVP)</div>
          <div className="mt-2 text-sm text-gray-600">
            Configure seus corretores via convites por e-mail e acompanhe o funil do time.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
