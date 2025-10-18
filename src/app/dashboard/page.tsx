"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Search, User, Home } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function UserDashboard() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const user = (session as any)?.user;
  const role = (session as any)?.user?.role || "USER";
  const [favorites, setFavorites] = useState<any[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Force session refresh on mount
  useEffect(() => {
    if (status === "authenticated") {
      update();
    }
  }, []); // Only on mount

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (user) {
      // Load favorites
      fetch("/api/favorites")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setFavorites(data.favorites || []);
          }
        })
        .catch(console.error);

      // Load saved searches
      fetch("/api/saved-searches")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSavedSearches(data.searches || []);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (status === "loading" || loading) {
    return (
      <DashboardLayout
        title="Meu Painel"
        description="Bem-vindo ao seu painel pessoal"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Painel" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Olá, ${user?.name?.split(" ")[0] || "Usuário"}! 👋`}
      description="Bem-vindo ao seu painel pessoal"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Painel" },
      ]}
    >

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Role Selection Card - Only for USER */}
        {role === "USER" && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Complete seu perfil
                </h3>
                <p className="text-gray-600 mb-4">
                  Escolha se você é corretor ou proprietário para acessar
                  recursos exclusivos e gerenciar seus imóveis.
                </p>
                <Link
                  href="/onboarding"
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  Completar Perfil
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Favorites Card */}
          <Link
            href="/favorites"
            className="card p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {favorites.length}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Imóveis Favoritos
            </h3>
            <p className="text-sm text-gray-600">
              Seus imóveis salvos para consulta rápida
            </p>
          </Link>

          {/* Saved Searches Card */}
          <Link
            href="/saved-searches"
            className="card p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {savedSearches.length}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Buscas Salvas
            </h3>
            <p className="text-sm text-gray-600">
              Suas pesquisas favoritas para acompanhamento
            </p>
          </Link>
        </div>

        {/* Recent Favorites */}
        {favorites.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Favoritos Recentes
              </h2>
              <Link
                href="/favorites"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Ver todos →
              </Link>
            </div>
            <div className="space-y-4">
              {favorites.slice(0, 5).map((fav: any) => (
                <div
                  key={fav.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      Imóvel #{fav.propertyId?.slice(0, 8)}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Adicionado aos favoritos
                    </p>
                  </div>
                  <Link
                    href={`/property/${fav.propertyId}`}
                    className="btn btn-secondary text-sm"
                  >
                    Ver
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {favorites.length === 0 && savedSearches.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Comece sua busca
            </h3>
            <p className="text-gray-600 mb-6">
              Explore imóveis e salve seus favoritos para acompanhamento
            </p>
            <Link href="/" className="btn btn-primary inline-flex items-center gap-2">
              <Search className="w-4 h-4" />
              Buscar Imóveis
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
