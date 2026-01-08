"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gray-50">
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg">
              <span className="text-white font-semibold text-lg">O</span>
            </div>
            <span className="text-sm font-semibold tracking-[0.18em] uppercase text-gray-700">
              OggaHub
            </span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Criar sua conta
            </h1>
            <p className="text-sm text-gray-600">
              Cadastre-se com seu e-mail para salvar favoritos, criar alertas e
              gerenciar anúncios.
            </p>
          </div>

          <div className="space-y-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-500"
                  placeholder="Como você quer ser chamado(a)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  E-mail
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-500"
                  placeholder="voce@exemplo.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-500"
                    placeholder="Crie uma senha segura"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Confirmar senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-500"
                    placeholder="Repita a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Criando conta..." : "Criar conta"}
              </button>
            </form>

            <p className="text-xs text-gray-600">
              Já tem conta?{" "}
              <Link
                href="/auth/signin"
                className="text-teal-700 hover:text-teal-800 font-semibold"
              >
                Entrar
              </Link>
            </p>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Ao continuar, você concorda com os{" "}
              <Link
                href="/terms"
                className="underline hover:text-teal-700"
              >
                Termos de uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacy"
                className="underline hover:text-teal-700"
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
            className="object-cover"
          />
        ))}
      </div>
    </main>
  );
}
