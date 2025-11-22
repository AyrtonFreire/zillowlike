"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Link inválido.");
      return;
    }

    if (!password) {
      setError("Informe a nova senha.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(data?.error || "Não foi possível redefinir sua senha.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/auth/signin");
        }, 3000);
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.55)] text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Link inválido
          </h1>
          <p className="text-sm text-slate-400 mb-4">
            O link de redefinição de senha parece estar incompleto ou expirado.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Solicitar novo link
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Redefinir senha
        </h1>
        <p className="text-sm text-slate-400 mb-4">
          Crie uma nova senha para acessar sua conta com segurança.
        </p>

        {success ? (
          <div className="text-sm text-slate-200 bg-slate-800/70 border border-slate-600/70 rounded-lg px-3 py-3">
            Sua senha foi redefinida com sucesso. Você será redirecionado para a
            tela de login em instantes.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmit}>
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Nova senha
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-400/70"
                placeholder="Crie uma senha segura"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Confirmar senha
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-400/70"
                placeholder="Repita a nova senha"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
