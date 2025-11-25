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
    if (!session) return;

    if (isAdmin) {
      router.replace("/admin");
    } else {
      router.replace("/realtor/register");
    }
  }, [isAdmin, router, session]);

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
        
        // Redireciona conforme o perfil escolhido
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <p className="text-sm text-gray-600 text-center">
        Redirecionando para o painel certo para você, aguarde um instante...
      </p>
    </div>
  );
}
