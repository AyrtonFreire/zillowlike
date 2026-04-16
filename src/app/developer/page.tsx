"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

type DeveloperProfileResponse = {
  id: string;
  legalName: string;
  brandName: string | null;
  displayName: string;
  cnpj: string;
  phone: string | null;
  website: string | null;
  businessType: string | null;
  description: string | null;
  logoUrl: string | null;
  teamId: string;
  workspace: {
    teamId: string;
    teamName: string | null;
    teamOwnerId: string | null;
    membersCount: number;
    invitesCount: number;
    developmentProjectsCount: number;
    propertiesCount: number;
    leadsCount: number;
    clientsCount: number;
    viewerWorkspaceRole: string | null;
    canManageWorkspace: boolean;
    canTransferOwner: boolean;
  };
  user: {
    id: string;
    role: string;
    name: string | null;
    email: string | null;
    image: string | null;
    phone: string | null;
    phoneVerified: boolean;
    publicCity: string | null;
    publicState: string | null;
  } | null;
};

function formatBusinessType(value?: string | null) {
  switch (value) {
    case "CONSTRUTORA":
      return "Construtora";
    case "INCORPORADORA":
      return "Incorporadora";
    case "LOTEADORA":
      return "Loteadora";
    case "URBANIZADORA":
      return "Urbanizadora";
    case "MISTA":
      return "Operação mista";
    default:
      return "Não definido";
  }
}

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-neutral-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{value}</div>
      <div className="mt-2 text-sm text-neutral-600">{helper}</div>
    </div>
  );
}

export default function DeveloperDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<DeveloperProfileResponse | null>(null);

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || "USER";
  }, [session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/developer");
      return;
    }

    if (status !== "authenticated") return;

    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/developer/profile", { cache: "no-store" });
        const data = await response.json().catch(() => null);

        if (!response.ok || data?.error) {
          if (!active) return;
          setError(data?.error || "Não foi possível carregar o workspace da incorporadora.");
          setProfile(null);
          return;
        }

        if (!active) return;
        setProfile(data.developerProfile as DeveloperProfileResponse);
      } catch {
        if (!active) return;
        setError("Erro inesperado ao carregar o painel da incorporadora.");
        setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [router, status]);

  if (status === "loading") {
    return (
      <DashboardLayout
        title="Painel da incorporadora"
        description="Carregando seu workspace institucional."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Incorporadora" },
        ]}
      >
        <div className="flex items-center justify-center py-24 text-neutral-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Painel da incorporadora"
      description="Base operacional inicial do novo workspace DEVELOPER."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Incorporadora" },
      ]}
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/developer/projects"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Empreendimentos
          </Link>
          <Link
            href="/developer/profile"
            className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Editar perfil
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            Minha conta
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-white py-20 text-neutral-500 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <div className="text-base font-semibold">Não foi possível carregar o painel.</div>
            <div className="mt-2 text-sm">{error}</div>
            {role !== "DEVELOPER" && role !== "ADMIN" ? (
              <div className="mt-4 text-sm">
                Seu perfil atual ainda não tem acesso ao workspace de incorporadora.
              </div>
            ) : null}
            <div className="mt-4">
              <Link href={role === "DEVELOPER" || role === "ADMIN" ? "/developer/profile" : "/developer/register"} className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 underline">
                Revisar cadastro
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : profile ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 md:grid-cols-2">
              <MetricCard
                label="Membros no workspace"
                value={profile.workspace.membersCount}
                helper="Time vinculado ao workspace da incorporadora"
              />
              <MetricCard
                label="Empreendimentos"
                value={profile.workspace.developmentProjectsCount}
                helper="Portfólio inicial de lançamentos do workspace"
              />
              <MetricCard
                label="Convites pendentes"
                value={profile.workspace.invitesCount}
                helper="Base pronta para expansão do time"
              />
              <MetricCard
                label="Leads monitorados"
                value={profile.workspace.leadsCount}
                helper="Entrada inicial para futuras esteiras de lançamentos"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                      <Building2 className="h-3.5 w-3.5" />
                      {formatBusinessType(profile.businessType)}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
                      {profile.displayName}
                    </h2>
                    <p className="mt-2 text-sm text-neutral-600">
                      {profile.legalName}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-right">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Role</div>
                    <div className="mt-1 text-sm font-semibold text-neutral-900">{profile.user?.role || "DEVELOPER"}</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">CNPJ</div>
                    <div className="mt-2 text-sm font-semibold text-neutral-900">{profile.cnpj}</div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Workspace</div>
                    <div className="mt-2 text-sm font-semibold text-neutral-900">{profile.workspace.teamName || "Sem nome"}</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 text-sm text-neutral-700 md:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-3">
                    <Mail className="h-4 w-4 text-neutral-500" />
                    <span>{profile.user?.email || "Email não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-3">
                    <Phone className="h-4 w-4 text-neutral-500" />
                    <span>{profile.phone || profile.user?.phone || "Telefone não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-3">
                    <Users className="h-4 w-4 text-neutral-500" />
                    <span>Papel no workspace: {profile.workspace.viewerWorkspaceRole || "Sem papel"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-3">
                    <Building2 className="h-4 w-4 text-neutral-500" />
                    <span>{profile.user?.publicCity && profile.user?.publicState ? `${profile.user.publicCity} · ${profile.user.publicState}` : "Localização pública ainda não preenchida"}</span>
                  </div>
                </div>

                {profile.description ? (
                  <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                    {profile.description}
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 p-4 text-sm text-neutral-600">
                    O resumo institucional ainda não foi preenchido. Você pode completar isso nas próximas iterações do perfil DEVELOPER.
                  </div>
                )}
              </section>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-950">Próximos passos</h3>
                  <div className="mt-4 space-y-3 text-sm text-neutral-700">
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                      A base de empreendimentos já está pronta para cadastro inicial no workspace.
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                      Próxima camada natural: conectar leads por empreendimento para a esteira comercial.
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                      Depois disso: gestão de unidades, parceiros e materiais comerciais do lançamento.
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-950">Dados institucionais</h3>
                  <div className="mt-4 space-y-3 text-sm text-neutral-700">
                    {profile.website ? (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Globe className="h-4 w-4 text-neutral-500" />
                          Website oficial
                        </span>
                        <ExternalLink className="h-4 w-4 text-neutral-500" />
                      </a>
                    ) : (
                      <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-neutral-500">
                        Website ainda não informado.
                      </div>
                    )}

                    <div className="rounded-xl border border-neutral-200 px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Permissões</div>
                      <div className="mt-2 text-sm text-neutral-700">
                        {profile.workspace.canManageWorkspace ? "Você já pode administrar este workspace." : "Seu acesso ainda é limitado para gestão."}
                      </div>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
