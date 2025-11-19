"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Building2, Home, Briefcase } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [selectedRole, setSelectedRole] = useState<"REALTOR" | "OWNER" | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin =
    (session as any)?.role === "ADMIN" ||
    ((session?.user as any)?.role ?? "") === "ADMIN";

  useEffect(() => {
    if (isAdmin) {
      router.replace("/admin");
    }
  }, [isAdmin, router]);

  const handleSubmit = async () => {
    if (isAdmin) return;
    if (!selectedRole) return;

    setLoading(true);
    try {
      const response = await fetch("/api/user/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (response.ok) {
        // Update session
        await update();
        
        // Redirect based on role
        if (selectedRole === "REALTOR") {
          router.push("/broker/dashboard");
        } else {
          router.push("/owner/dashboard");
        }
      } else {
        alert("Erro ao atualizar perfil. Tente novamente.");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <Building2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo ao Zillowlike!
          </h1>
          <p className="text-gray-600">
            Para começar, nos conte qual é o seu perfil:
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Corretor de Imóveis */}
          <button
            onClick={() => setSelectedRole("REALTOR")}
            className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
              selectedRole === "REALTOR"
                ? "border-blue-600 bg-blue-50 shadow-lg scale-105"
                : "border-gray-200 hover:border-blue-300 hover:shadow-md"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                selectedRole === "REALTOR" ? "glass-teal" : "bg-gray-100"
              }`}>
                <Briefcase className={`w-6 h-6 ${
                  selectedRole === "REALTOR" ? "text-white" : "text-gray-600"
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Sou Corretor de Imóveis
                </h3>
                <p className="text-sm text-gray-600">
                  Quero receber leads de clientes interessados em imóveis e gerenciar
                  minha carteira de oportunidades.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 glass-teal rounded-full"></span>
                    Receber leads qualificados
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 glass-teal rounded-full"></span>
                    Sistema de fila inteligente
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 glass-teal rounded-full"></span>
                    Dashboard de métricas
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* Proprietário */}
          <button
            onClick={() => setSelectedRole("OWNER")}
            className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
              selectedRole === "OWNER"
                ? "border-green-600 bg-green-50 shadow-lg scale-105"
                : "border-gray-200 hover:border-green-300 hover:shadow-md"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                selectedRole === "OWNER" ? "bg-green-600" : "bg-gray-100"
              }`}>
                <Home className={`w-6 h-6 ${
                  selectedRole === "OWNER" ? "text-white" : "text-gray-600"
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Sou Proprietário
                </h3>
                <p className="text-sm text-gray-600">
                  Quero anunciar meus imóveis e receber propostas de clientes
                  interessados.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                    Anunciar imóveis gratuitamente
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                    Receber propostas diretas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                    Gerenciar anúncios
                  </li>
                </ul>
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedRole || loading}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
              selectedRole && !loading
                ? "glass-teal shadow-lg hover:shadow-xl"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {loading ? "Salvando..." : "Continuar"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Você poderá alterar seu perfil depois nas configurações da conta.
        </p>
      </div>
    </div>
  );
}
