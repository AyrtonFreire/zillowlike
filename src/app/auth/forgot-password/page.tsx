"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Informe seu e-mail.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setError("Não foi possível processar a solicitação.");
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Esqueci minha senha
        </h1>
        <p className="text-sm text-slate-400 mb-4">
          Informe o e-mail cadastrado para enviarmos um link de redefinição de
          senha.
        </p>

        {submitted ? (
          <div className="text-sm text-slate-200 bg-slate-800/70 border border-slate-600/70 rounded-lg px-3 py-3">
            Se existir uma conta com este e-mail, você receberá em breve um link
            para redefinir sua senha.
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
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-400/70"
                placeholder="voce@exemplo.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Enviando..." : "Enviar link de redefinição"}
            </button>
          </form>
        )}

        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-slate-200">Outras formas de recuperar</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <Link href="/auth/recover-phone" className="text-teal-300 hover:text-teal-200 font-semibold">
              Recuperar por telefone
            </Link>
            <Link href="/auth/recover-backup-code" className="text-teal-300 hover:text-teal-200 font-semibold">
              Backup code
            </Link>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Lembrou a senha?{" "}
          <Link
            href="/auth/signin"
            className="text-teal-300 hover:text-teal-200 font-semibold"
          >
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
