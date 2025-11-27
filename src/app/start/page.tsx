"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Home, Briefcase, ArrowRight, Loader2, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

interface OnboardingStatus {
  authenticated: boolean;
  role: string;
  hasProperties: boolean;
  propertyCount: number;
  realtorApplication: "PENDING" | "APPROVED" | "REJECTED" | null;
}

export default function StartPage() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          signIn(undefined, { callbackUrl: "/start" });
          return;
        }
        throw new Error(data.error || "Erro ao verificar status");
      }

      setOnboardingStatus(data);

      // Auto-redirect based on role
      if (data.role === "OWNER") {
        router.push("/owner/new");
        return;
      }

      // Corretores e imobiliárias que clicam em "Anunciar imóvel" devem ir direto
      // para a página de criação de anúncio, assim como proprietários.
      if (data.role === "REALTOR" || data.role === "AGENCY") {
        router.push("/owner/new");
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
      router.push("/owner/new");
    } catch (err) {
      console.error("Error becoming owner:", err);
      setError("Erro ao atualizar perfil. Tente novamente.");
      setUpdating(false);
    }
  };

  const handleChooseOwner = async () => {
    await becomeOwner();
  };

  const handleChooseRealtor = () => {
    // Redirect to realtor application page
    router.push("/broker/apply");
  };

  // Loading state
  if (loading || sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
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
    );
  }

  // Check if user has pending realtor application
  if (onboardingStatus?.realtorApplication === "PENDING") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Aplicação em análise
          </h1>
          <p className="text-gray-600 mb-6">
            Sua aplicação para se tornar corretor está sendo analisada pela nossa equipe.
            Você receberá uma notificação assim que for aprovada.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors"
            >
              Voltar para a home
            </Link>
            <button
              onClick={handleChooseOwner}
              disabled={updating}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {updating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </span>
              ) : (
                "Continuar como proprietário"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Onboarding UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              Z
            </div>
            <span className="text-xl font-bold text-gray-900">ZillowLike</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Como você quer anunciar?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Escolha a opção que melhor descreve você para personalizarmos sua experiência
          </p>
        </div>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
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

          {/* Realtor Option */}
          <button
            onClick={handleChooseRealtor}
            disabled={updating}
            className="group relative bg-white rounded-2xl border-2 border-gray-200 p-8 text-left hover:border-blue-500 hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Sou Corretor
            </h2>
            <p className="text-gray-600 mb-4">
              Sou corretor de imóveis credenciado e quero receber leads.
            </p>
            
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                Receba leads qualificados
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                Entre na fila inteligente
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                Ganhe por performance
              </li>
            </ul>

            <div className="mt-4 inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              <span>Requer CRECI ativo</span>
            </div>
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
