"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { Building2, ShieldAlert } from "lucide-react";
import { ModernNavbar } from "@/components/modern";

const businessTypeOptions = [
  { value: "CONSTRUTORA", label: "Construtora" },
  { value: "INCORPORADORA", label: "Incorporadora" },
  { value: "LOTEADORA", label: "Loteadora" },
  { value: "URBANIZADORA", label: "Urbanizadora" },
  { value: "MISTA", label: "Operação mista" },
] as const;

export default function DeveloperRegisterPage() {
  const { data: session, status, update } = useSession();

  const [legalName, setLegalName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [businessType, setBusinessType] = useState<(typeof businessTypeOptions)[number]["value"]>("INCORPORADORA");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn(undefined, { callbackUrl: "/developer/register" });
      return;
    }
  }, [status]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedLegalName = legalName.trim();
    const normalizedCnpj = cnpj.trim();

    if (!normalizedLegalName || !normalizedCnpj) {
      setError("Preencha razão social e CNPJ.");
      return;
    }

    if (!confirm) {
      setError("Confirme que esta mudança é definitiva.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/become-developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: normalizedLegalName,
          brandName: brandName.trim() || undefined,
          cnpj: normalizedCnpj,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          businessType,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.error) {
        setError(data?.error || "Não foi possível registrar sua incorporadora agora.");
        return;
      }

      setSuccess("Incorporadora registrada com sucesso. Redirecionando...");

      try {
        await update();
      } catch {
      }

      window.location.href = "/developer";
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar forceLight />
      <main className="mt-20 flex justify-center px-4 pb-16">
        <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Registrar como Incorporadora
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Crie o workspace institucional para gerir empreendimentos, parceiros e leads de lançamentos.
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5" />
            <div>
              <p className="font-semibold">Importante</p>
              <p className="mt-1">
                Ao virar incorporadora, sua conta passa a operar como workspace institucional da empresa.
              </p>
              <p className="mt-1">
                Se você também atua em outras frentes comerciais, recomendamos manter contas separadas.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Razão social</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Ex: Lançamentos Horizonte SPE Ltda"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome fantasia (opcional)</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ex: Horizonte Urbanismo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de operação</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as (typeof businessTypeOptions)[number]["value"])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white"
                >
                  {businessTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (opcional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(DDD) 9 9999-9999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website (opcional)</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://suaempresa.com.br"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <span>
                Entendi que minha conta passará a ser do tipo Incorporadora e que essa mudança é definitiva.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Salvando..." : "Confirmar e virar Incorporadora"}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-gray-500">
            Voltar para <Link href="/account" className="underline">Minha conta</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
