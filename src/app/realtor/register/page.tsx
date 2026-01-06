"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, ShieldCheck } from "lucide-react";
import { validateCRECI } from "@/lib/validators/creci";
import { ModernNavbar } from "@/components/modern";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export default function RealtorRegisterPage() {
  const { status } = useSession();
  const router = useRouter();

  const [creci, setCreci] = useState("");
  const [creciState, setCreciState] = useState("");
  const [realtorType, setRealtorType] = useState<"AUTONOMO" | "IMOBILIARIA" | "">("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin?callbackUrl=/realtor/register");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <ModernNavbar forceLight />
        <div className="mt-24 flex items-center justify-center text-gray-500 text-sm">
          Carregando...
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!creci.trim() || !creciState.trim() || !realtorType) {
      setError("Preencha CRECI, estado do CRECI e o tipo de atuação.");
      return;
    }

    const validation = validateCRECI(creci, creciState);
    if (!validation.valid) {
      setError(validation.message || "CRECI inválido. Confira o número e o formato (ex: 12345-F).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "REALTOR",
          creci: creci.trim(),
          creciState: creciState.trim().toUpperCase(),
          realtorType,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        setError(data?.error || "Não foi possível concluir o cadastro como corretor agora.");
        return;
      }

      setSuccess("Cadastro como corretor realizado com sucesso. Agora você pode configurar seu perfil público.");
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      <main className="mt-20 flex justify-center px-4 pb-16">
        <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Cadastro rápido de corretor</h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Essas informações identificam você como profissional no site.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CRECI</label>
              <input
                type="text"
                value={creci}
                onChange={(e) => setCreci(e.target.value)}
                placeholder="Ex: 12345-F"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado do CRECI (UF)</label>
                <select
                  value={creciState}
                  onChange={(e) => setCreciState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="">Selecione</option>
                  {BRAZILIAN_STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de atuação</label>
                <select
                  value={realtorType}
                  onChange={(e) => setRealtorType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                >
                  <option value="">Selecione</option>
                  <option value="AUTONOMO">Corretor(a) autônomo(a)</option>
                  <option value="IMOBILIARIA">Imobiliária</option>
                </select>
              </div>
            </div>

            {creci && (
              <p className="text-[11px] text-gray-500">
                Validamos apenas o formato do CRECI (quantidade de dígitos e sufixo). A conferência oficial do registro continua
                sendo feita no fluxo de parceria.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold glass-teal text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Salvando..." : "Confirmar cadastro como corretor"}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-gray-500">
            Você pode completar seu perfil público a qualquer momento nas configurações da conta.
          </p>
        </div>
      </main>
    </div>
  );
}
