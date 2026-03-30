"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ModernNavbar } from "@/components/modern";
import SiteFooter from "@/components/Footer";
import Button from "@/components/ui/Button";
import {
  User,
  Mail,
  Shield,
  CheckCircle,
  XCircle,
  Heart,
  LayoutDashboard,
  Home,
  MessageSquare,
  LogOut,
  Settings,
  Building2,
  Bell,
} from "lucide-react";

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  emailVerified: string | null;
  phone?: string | null;
  phoneVerifiedAt: string | null;
  stats?: {
    properties: number;
    favorites: number;
    leadsReceived: number;
    leadsSent: number;
  };
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm shadow-black/5">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-teal-50 p-2 text-teal-700 transition-colors group-hover:bg-teal-100">{icon}</div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900">{title}</div>
          <div className="mt-1 text-sm text-gray-600">{description}</div>
        </div>
      </div>
    </Link>
  );
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const role = useMemo(() => {
    const s: any = session as any;
    return s?.user?.role || s?.role || profile?.role || "USER";
  }, [session, profile]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/user/profile");
        if (!r.ok) return;
        const j = await r.json().catch(() => null);
        if (j?.success && j?.user) setProfile(j.user);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [session, status]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Minha conta</h1>
          <p className="text-gray-600 mb-8">
            Entre para acessar seus favoritos, newsletter e gerenciar seus anúncios.
          </p>
          <Link href="/auth/signin" className="inline-flex">
            <Button>Fazer login</Button>
          </Link>
        </div>
      </main>
    );
  }

  const name = profile?.name || session.user?.name || "";
  const email = profile?.email || session.user?.email || "";
  const emailVerified = Boolean(profile?.emailVerified);
  const phoneVerified = Boolean(profile?.phoneVerifiedAt);

  const stats = profile?.stats || {
    properties: 0,
    favorites: 0,
    leadsReceived: 0,
    leadsSent: 0,
  };

  const roleActions = (() => {
    const canBecomeAgency = role !== "AGENCY" && role !== "ADMIN";
    const becomeAgencyAction = {
      title: "Virar Agência",
      description: "Crie um workspace para monitorar leads e organizar corretores.",
      href: "/agency/register",
      icon: <Building2 className="w-5 h-5" />,
    };

    if (role === "OWNER") {
      const actions = [
        {
          title: "Dashboard",
          description: "Acompanhe desempenho, leads e qualidade dos anúncios.",
          href: "/owner/dashboard",
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          title: "Meus anúncios",
          description: "Crie, edite e publique seus imóveis.",
          href: "/owner/properties",
          icon: <Home className="w-5 h-5" />,
        },
        {
          title: "Meus leads",
          description: "Responda interessados e acompanhe conversas.",
          href: "/owner/leads",
          icon: <MessageSquare className="w-5 h-5" />,
        },
      ];

      if (canBecomeAgency) actions.push(becomeAgencyAction);
      return actions;
    }

    if (role === "REALTOR" || role === "AGENCY") {
      const actions = [
        {
          title: "Painel",
          description: "Visão geral do seu funil e atividades.",
          href: "/broker/dashboard",
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          title: "Leads",
          description: "Gerencie leads e histórico de contatos.",
          href: "/broker/leads",
          icon: <MessageSquare className="w-5 h-5" />,
        },
        {
          title: "Imóveis",
          description: "Gerencie seus imóveis e captações.",
          href: "/broker/properties",
          icon: <Home className="w-5 h-5" />,
        },
        {
          title: "OLX",
          description: "Conecte e teste publicação via OLX.",
          href: "/account/olx",
          icon: <Settings className="w-5 h-5" />,
        },
      ];

      if (canBecomeAgency) actions.push(becomeAgencyAction);
      return actions;
    }

    if (role === "ADMIN") {
      return [
        {
          title: "Painel Admin",
          description: "Administre imóveis, usuários e relatórios.",
          href: "/admin",
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          title: "Configurações",
          description: "Ajustes administrativos e parâmetros do sistema.",
          href: "/admin/settings",
          icon: <Settings className="w-5 h-5" />,
        },
      ];
    }

    if (role === "USER") {
      return canBecomeAgency ? [becomeAgencyAction] : [];
    }

    return [];
  })();

  return (
    <main className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-display">Minha conta</h1>
            <p className="text-gray-600 mt-1">Gerencie seu perfil, favoritos e acessos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/profile">
              <Button variant="secondary">Editar perfil</Button>
            </Link>
            <Button
              type="button"
              variant="secondary"
              leftIcon={<LogOut className="w-4 h-4" />}
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sair
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal text-lg font-semibold text-white shadow-sm">
                  {(name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-gray-900 truncate">{name || "Usuário"}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{email || "-"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      <Shield className="w-3.5 h-3.5" />
                      {role}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${emailVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {emailVerified ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {emailVerified ? "E-mail verificado" : "E-mail pendente"}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${phoneVerified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {phoneVerified ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {phoneVerified ? "Telefone verificado" : "Telefone"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link href="/favorites" className="rounded-2xl border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Heart className="w-4 h-4 text-red-500" />
                    Favoritos
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Veja seus imóveis salvos</div>
                </Link>
                <Link href="/account/communication" className="col-span-2 rounded-2xl border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Bell className="w-4 h-4 text-teal-600" />
                    Comunicação por e-mail
                  </div>
                  <div className="mt-2 text-xs text-gray-600">Ajuste alertas, resumos e conteúdos enviados para você</div>
                </Link>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  className="w-full"
                  leftIcon={<User className="w-4 h-4" />}
                  onClick={() => router.push("/profile")}
                >
                  Configurações do perfil
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Anúncios" value={Number(stats.properties || 0)} />
              <StatCard label="Favoritos" value={Number(stats.favorites || 0)} />
              <StatCard label="Leads recebidos" value={Number(stats.leadsReceived || 0)} />
              <StatCard label="Leads enviados" value={Number(stats.leadsSent || 0)} />
            </div>

            <div className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm shadow-black/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Atalhos</div>
                  <div className="text-sm text-gray-600">Acesse rapidamente as principais áreas.</div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
                </div>
              ) : roleActions.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-700">
                  Seu perfil ainda não tem atalhos específicos. Use os links principais disponíveis ou edite seu perfil.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roleActions.map((a) => (
                    <ActionCard key={a.href} title={a.title} description={a.description} href={a.href} icon={a.icon} />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm shadow-black/5">
              <div className="text-lg font-semibold text-gray-900">Privacidade e segurança</div>
              <div className="mt-2 text-sm text-gray-600">
                Mantenha seus dados atualizados e verifique e-mail/telefone para aumentar a confiança no seu perfil.
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Link href="/profile" className="inline-flex">
                  <Button variant="secondary" className="w-full sm:w-auto">Atualizar dados</Button>
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  leftIcon={<LogOut className="w-4 h-4" />}
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sair da conta
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
