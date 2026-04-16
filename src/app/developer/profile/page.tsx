"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ExternalLink, Loader2, Save } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import Toast from "@/components/Toast";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

const businessTypeOptions = [
  { value: "CONSTRUTORA", label: "Construtora" },
  { value: "INCORPORADORA", label: "Incorporadora" },
  { value: "LOTEADORA", label: "Loteadora" },
  { value: "URBANIZADORA", label: "Urbanizadora" },
  { value: "MISTA", label: "Operação mista" },
] as const;

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
  updatedAt: string;
  workspace: {
    teamId: string;
    teamName: string | null;
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

type DeveloperProfileForm = {
  legalName: string;
  brandName: string;
  phone: string;
  website: string;
  businessType: string;
  description: string;
  logoUrl: string;
};

const emptyForm: DeveloperProfileForm = {
  legalName: "",
  brandName: "",
  phone: "",
  website: "",
  businessType: "INCORPORADORA",
  description: "",
  logoUrl: "",
};

function mapProfileToForm(profile: DeveloperProfileResponse): DeveloperProfileForm {
  return {
    legalName: profile.legalName || "",
    brandName: profile.brandName || "",
    phone: profile.phone || "",
    website: profile.website || "",
    businessType: profile.businessType || "INCORPORADORA",
    description: profile.description || "",
    logoUrl: profile.logoUrl || "",
  };
}

export default function DeveloperProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<DeveloperProfileResponse | null>(null);
  const [form, setForm] = useState<DeveloperProfileForm>(emptyForm);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/developer/profile");
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

        if (!response.ok || !data?.success || !data?.developerProfile) {
          if (!active) return;
          setError(data?.error || "Não foi possível carregar o perfil da incorporadora.");
          setProfile(null);
          return;
        }

        if (!active) return;
        const nextProfile = data.developerProfile as DeveloperProfileResponse;
        setProfile(nextProfile);
        setForm(mapProfileToForm(nextProfile));
      } catch {
        if (!active) return;
        setError("Erro inesperado ao carregar a configuração da incorporadora.");
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

  const canManageWorkspace = Boolean(profile?.workspace.canManageWorkspace);

  async function handleSave() {
    if (!profile || saving || !canManageWorkspace) return;

    setSaving(true);
    setToast(null);

    try {
      const response = await fetch("/api/developer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data?.developerProfile) {
        setToast({ message: data?.error || "Não foi possível salvar os dados da incorporadora.", type: "error" });
        return;
      }

      const nextProfile = data.developerProfile as DeveloperProfileResponse;
      setProfile(nextProfile);
      setForm(mapProfileToForm(nextProfile));
      setToast({ message: "Dados da incorporadora salvos com sucesso.", type: "success" });
    } catch {
      setToast({ message: "Erro inesperado ao salvar os dados da incorporadora.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <DashboardLayout
        title="Dados da incorporadora"
        description="Carregando informações do workspace."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Incorporadora", href: "/developer" },
          { label: "Dados da empresa" },
        ]}
      >
        <div className="flex items-center justify-center py-24 text-neutral-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <DashboardLayout
        title="Dados da incorporadora"
        description="Gerencie os dados institucionais e comerciais básicos do workspace DEVELOPER."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Incorporadora", href: "/developer" },
          { label: "Dados da empresa" },
        ]}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/developer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao painel
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canManageWorkspace || saving || !profile}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {error || !profile ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
              <div className="text-base font-semibold">Não foi possível carregar os dados da incorporadora.</div>
              <div className="mt-2 text-sm">{error || "Perfil da incorporadora não encontrado."}</div>
              <div className="mt-4">
                <Link href="/developer" className="text-sm font-semibold underline">
                  Voltar para o painel
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Razão social"
                    required
                    value={form.legalName}
                    onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))}
                    disabled={!canManageWorkspace || saving}
                  />
                  <Input
                    label="Nome fantasia"
                    value={form.brandName}
                    onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))}
                    disabled={!canManageWorkspace || saving}
                  />
                  <Input label="CNPJ" value={profile.cnpj} disabled />
                  <Select
                    label="Tipo de operação"
                    value={form.businessType}
                    onChange={(event) => setForm((current) => ({ ...current, businessType: event.target.value }))}
                    disabled={!canManageWorkspace || saving}
                  >
                    {businessTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Telefone comercial"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    disabled={!canManageWorkspace || saving}
                    placeholder="(11) 99999-9999"
                  />
                  <Input
                    label="Website"
                    value={form.website}
                    onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                    disabled={!canManageWorkspace || saving}
                    placeholder="https://suaempresa.com.br"
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <Input
                    label="Logo URL"
                    value={form.logoUrl}
                    onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
                    disabled={!canManageWorkspace || saving}
                    placeholder="https://..."
                  />
                  <Textarea
                    label="Descrição institucional"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    disabled={!canManageWorkspace || saving}
                    rows={6}
                    placeholder="Descreva o posicionamento, foco geográfico e proposta da incorporadora."
                  />
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-neutral-950">Resumo do workspace</h2>
                  <div className="mt-4 space-y-3 text-sm text-neutral-700">
                    <div className="rounded-xl border border-neutral-200 px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Workspace</div>
                      <div className="mt-2 font-semibold text-neutral-900">{profile.workspace.teamName || profile.displayName}</div>
                    </div>
                    <div className="rounded-xl border border-neutral-200 px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Seu papel</div>
                      <div className="mt-2 font-semibold text-neutral-900">{profile.workspace.viewerWorkspaceRole || "Sem papel"}</div>
                    </div>
                    <div className="rounded-xl border border-neutral-200 px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Contato principal</div>
                      <div className="mt-2 text-neutral-900">{profile.user?.email || "Email não informado"}</div>
                    </div>
                    <div className="rounded-xl border border-neutral-200 px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Última atualização</div>
                      <div className="mt-2 text-neutral-900">
                        {new Date(profile.updatedAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-neutral-950">Acesso e publicação</h2>
                  <div className="mt-4 space-y-3 text-sm text-neutral-700">
                    <div className="rounded-xl border border-neutral-200 px-4 py-3">
                      {canManageWorkspace
                        ? "Você pode editar os dados institucionais deste workspace."
                        : "Seu acesso permite visualização, mas não edição dos dados institucionais."}
                    </div>
                    {profile.website ? (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50"
                      >
                        <span>Visitar website</span>
                        <ExternalLink className="h-4 w-4 text-neutral-500" />
                      </a>
                    ) : null}
                    <Link
                      href="/developer"
                      className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 transition hover:bg-neutral-50"
                    >
                      <span>Voltar ao painel</span>
                      <ArrowLeft className="h-4 w-4 text-neutral-500" />
                    </Link>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
