"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Home, ArrowRight, Loader2, CheckCircle2, X } from "lucide-react";
import Link from "next/link";

interface OnboardingStatus {
  authenticated: boolean;
  role: string;
  hasProperties: boolean;
  propertyCount: number;
  error?: string;
}

export default function StartPage() {
  const { status: sessionStatus, update: updateSession } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<null | { city?: string; state?: string; priceBRL?: string }>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  const resumeSubtitle = useMemo(() => {
    if (!resumeDraft) return null;
    const parts: string[] = [];
    if (resumeDraft.city && resumeDraft.state) parts.push(`${resumeDraft.city}/${resumeDraft.state}`);
    else if (resumeDraft.city) parts.push(String(resumeDraft.city));
    else if (resumeDraft.state) parts.push(String(resumeDraft.state));
    if (resumeDraft.priceBRL) parts.push(`R$ ${String(resumeDraft.priceBRL)}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [resumeDraft]);

  const hasDraftContent = (d: any) => {
    try {
      return Boolean(
        d &&
          (d.description ||
            d.priceBRL ||
            d.street ||
            d.city ||
            d.state ||
            (Array.isArray(d.images) && d.images.length > 0))
      );
    } catch {
      return false;
    }
  };

  const resumeModal = resumeOpen ? (
    <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          setResumeOpen(false);
          router.push("/");
        }}
      />
      <div
        className="relative z-[60001] bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-blue-100">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Você tem um anúncio em andamento</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Deseja continuar a postagem de onde parou ou iniciar uma nova?
              </p>
              {resumeSubtitle && <p className="mt-2 text-xs font-semibold text-gray-500">{resumeSubtitle}</p>}
            </div>
            <button
              type="button"
              onClick={() => {
                setResumeOpen(false);
                router.push("/");
              }}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex flex-col gap-3">
          <button
            type="button"
            disabled={resumeLoading}
            onClick={() => {
              const target = pendingRedirect || "/owner/new";
              setResumeOpen(false);
              router.push(target);
            }}
            className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-60"
          >
            Continuar postagem
          </button>
          <button
            type="button"
            disabled={resumeLoading}
            onClick={async () => {
              const target = pendingRedirect || "/owner/new";
              await clearDraftEverywhere();
              setResumeOpen(false);
              router.push(target);
            }}
            className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-60"
          >
            Iniciar nova
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const readDraftFromLocalStorage = () => {
    try {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem("owner_new_draft");
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!hasDraftContent(d)) return null;
      return d;
    } catch {
      return null;
    }
  };

  const getDraftPreview = (d: any) => {
    if (!d) return null;
    return {
      city: d.city || undefined,
      state: d.state || undefined,
      priceBRL: d.priceBRL || undefined,
    };
  };

  const clearDraftEverywhere = async () => {
    try {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("owner_new_draft");
        } catch {}
      }
      await fetch("/api/properties/draft", { method: "DELETE" }).catch(() => undefined);
    } catch {
    }
  };

  const checkDraftAndMaybeAsk = async (targetUrl: string) => {
    setPendingRedirect(targetUrl);
    const localDraft = readDraftFromLocalStorage();
    if (localDraft) {
      setResumeDraft(getDraftPreview(localDraft));
      setResumeOpen(true);
      return;
    }

    try {
      setResumeLoading(true);
      const res = await fetch("/api/properties/draft", { cache: "no-store" });
      if (!res.ok) {
        router.push(targetUrl);
        return;
      }
      const json = await res.json().catch(() => null);
      const draft = json?.draft as any;
      const d = (draft?.data || null) as any;
      if (!d || !hasDraftContent(d)) {
        router.push(targetUrl);
        return;
      }
      setResumeDraft(getDraftPreview(d));
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("owner_new_draft", JSON.stringify(d));
        }
      } catch {}
      setResumeOpen(true);
    } catch {
      router.push(targetUrl);
    } finally {
      setResumeLoading(false);
    }
  };

  useEffect(() => {
    // Wait for session to be determined
    if (sessionStatus === "loading") return;

    // If not authenticated, redirect to sign in
    if (sessionStatus === "unauthenticated") {
      signIn(undefined, { callbackUrl: "/start" });
      return;
    }

    // Fetch onboarding status
    fetchOnboardingStatus();
  }, [sessionStatus]);

  const fetchOnboardingStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/onboarding-status");
      const data: OnboardingStatus = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          signIn(undefined, { callbackUrl: "/start" });
          return;
        }
        throw new Error(data.error || "Erro ao verificar status");
      }

      // Auto-redirect based on role
      if (data.role === "OWNER") {
        await checkDraftAndMaybeAsk("/owner/new");
        return;
      }

      // Corretores e imobiliárias que clicam em "Anunciar imóvel" devem ir direto
      // para a página de criação de anúncio, assim como proprietários.
      if (data.role === "REALTOR") {
        await checkDraftAndMaybeAsk("/owner/new");
        return;
      }

      if (data.role === "AGENCY") {
        await checkDraftAndMaybeAsk("/owner/new");
        return;
      }

      if (data.role === "ADMIN") {
        router.push("/admin");
        return;
      }

      // If USER has properties, auto-upgrade to OWNER
      if (data.role === "USER" && data.hasProperties) {
        await becomeOwner();
        return;
      }

      // USER without properties - show onboarding
      setLoading(false);
    } catch (err) {
      console.error("Error fetching onboarding status:", err);
      setError("Erro ao carregar. Tente novamente.");
      setLoading(false);
    }
  };

  const becomeOwner = async () => {
    try {
      setUpdating(true);
      const response = await fetch("/api/user/become-owner", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar perfil");
      }

      // Refresh session to get new role
      await updateSession();

      // Redirect to property creation
      await checkDraftAndMaybeAsk("/owner/new");
    } catch (err) {
      console.error("Error becoming owner:", err);
      setError("Erro ao atualizar perfil. Tente novamente.");
      setUpdating(false);
    }
  };

  const handleChooseOwner = async () => {
    await becomeOwner();
  };

  // Loading state
  if (loading || sessionStatus === "loading") {
    return (
      <>
        {resumeModal}
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        {resumeModal}
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ops!</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchOnboardingStatus();
              }}
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </>
    );
  }

  // Onboarding UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      {resumeModal}

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              O
            </div>
            <span className="text-xl font-bold text-gray-900">OggaHub</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Vamos anunciar seu imóvel
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Configure seu perfil de anunciante e publique seus imóveis.
          </p>
        </div>

        {/* Options */}
        <div className="grid md:grid-cols-1 gap-6 max-w-3xl mx-auto">
          {/* Owner Option */}
          <button
            onClick={handleChooseOwner}
            disabled={updating}
            className="group relative bg-white rounded-2xl border-2 border-gray-200 p-8 text-left hover:border-teal-500 hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-4 h-4 text-teal-600" />
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Home className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Sou Proprietário
            </h2>
            <p className="text-gray-600 mb-4">
              Tenho um ou mais imóveis e quero anunciar para venda ou locação.
            </p>
            
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500" />
                Anuncie gratuitamente
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500" />
                Receba leads de interessados
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500" />
                Gerencie seus anúncios
              </li>
            </ul>

            {updating && (
              <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              </div>
            )}
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Você pode mudar essa opção depois nas configurações da sua conta.
        </p>
      </div>
    </div>
  );
}
