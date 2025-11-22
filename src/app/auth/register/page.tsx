"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000",
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(data?.error || "Não foi possível criar sua conta.");
        setIsLoading(false);
        return;
      }

      router.push(`/auth/verify-email-sent?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-950">
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg">
              <span className="text-white font-semibold text-lg">Z</span>
            </div>
            <span className="text-sm font-semibold tracking-[0.18em] uppercase text-slate-300">
              ZillowLike
            </span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2">
              Criar sua conta
            </h1>
            <p className="text-sm text-slate-400">
              Cadastre-se com seu e-mail para salvar favoritos, criar alertas e
              gerenciar anúncios.
            </p>
          </div>

          <div className="space-y-4 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-400/70"
                  placeholder="Como você quer ser chamado(a)"
                />
              </div>

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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Senha
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
                  placeholder="Repita a senha"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Criando conta..." : "Criar conta"}
              </button>
            </form>

            <p className="text-xs text-slate-400">
              Já tem conta?{" "}
              <Link
                href="/auth/signin"
                className="text-teal-300 hover:text-teal-200 font-semibold"
              >
                Entrar
              </Link>
            </p>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ao continuar, você concorda com os{" "}
              <Link
                href="/terms"
                className="underline hover:text-teal-200"
              >
                Termos de uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacy"
                className="underline hover:text-teal-200"
              >
                Política de privacidade
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="relative hidden lg:block overflow-hidden">
        {IMAGES.map((src) => (
          <Image
            key={src}
            src={src}
            alt="Casa"
            fill
            className="object-cover opacity-90"
          />
        ))}
      </div>
    </main>
  );
}
