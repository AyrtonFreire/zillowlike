"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RecoverBackupCodePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setError(null);

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }

    if (!code.trim()) {
      setError("Informe o backup code.");
      return;
    }

    if (!password || password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/recovery/backup-code/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não foi possível redefinir sua senha.");
      }

      setSuccess(true);
      setTimeout(() => router.push("/auth/signin"), 2500);
    } catch (err: any) {
      setError(err.message || "Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
        <h1 className="text-2xl font-semibold text-white mb-2">Recuperar com backup code</h1>
        <p className="text-sm text-slate-400 mb-4">
          Use um dos seus códigos de backup para redefinir a senha. Cada código só pode ser usado uma vez.
        </p>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-sm text-slate-200 bg-slate-800/70 border border-slate-600/70 rounded-lg px-3 py-3">
            Sua senha foi redefinida com sucesso. Você será redirecionado para a tela de login.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-400/70"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Backup code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCDE-FGHIJ"
                className="w-full tracking-[0.25em] text-center rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-400/70"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Nova senha</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-400/70"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Confirmar senha</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-400/70"
              />
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={submit}
              className="w-full inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Salvando..." : "Redefinir senha"}
            </button>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Voltar para{" "}
          <Link href="/auth/signin" className="text-teal-300 hover:text-teal-200 font-semibold">
            login
          </Link>
        </p>
      </div>
    </main>
  );
}
