"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

const IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000",
];

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [idx, setIdx] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % IMAGES.length), 5000);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Informe e-mail e senha.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (!res) {
        setError("Não foi possível entrar agora.");
        setIsLoading(false);
        return;
      }

      if (res.error) {
        setError("Credenciais inválidas ou conta não encontrada.");
        setIsLoading(false);
        return;
      }

      if (res.ok && res.url) {
        router.push(res.url);
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
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
              Entrar
            </h1>
            <p className="text-sm text-gray-600">
              Acesse sua conta para salvar favoritos, criar alertas e gerenciar
              seus anúncios.
            </p>
          </div>

          <div className="space-y-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            {error && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                signIn("google", { callbackUrl, prompt: "select_account" })
              }
              className="w-full inline-flex items-center justify-center gap-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-5 h-5"
              >
                <path
                  fill="#FFC107"
                  d="M43.611,20.083H42V20H24v8h11.303C33.602,32.91,29.17,36,24,36c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.682,8.337,6.306,14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24,44c5.113,0,9.81-1.957,13.363-5.146l-6.175-5.238C29.139,35.091,26.715,36,24,36c-5.146,0-9.489-3.112-11.189-7.444l-6.5,5.02C9.631,39.556,16.337,44,24,44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611,20.083H42V20H24v8h11.303c-1.091,3.204-3.513,5.793-6.642,7.115c0.001-0.001,0.002-0.001,0.003-0.002l6.175,5.238C34.496,40.638,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                />
              </svg>
              Continuar com Google
            </button>

            <div className="flex items-center gap-3 text-[11px] text-gray-500">
              <div className="h-px flex-1 bg-gray-200" />
              <span>ou entrar com e-mail</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
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
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-500"
                  placeholder="Sua senha"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <Link
                  href="/auth/forgot-password"
                  className="text-teal-700 hover:text-teal-800 font-semibold"
                >
                  Esqueci minha senha
                </Link>

                <div className="flex items-center gap-3">
                  <Link
                    href="/auth/recover-phone"
                    className="text-teal-700 hover:text-teal-800 font-semibold"
                  >
                    Recuperar por telefone
                  </Link>

                  <Link
                    href="/auth/recover-backup-code"
                    className="text-teal-700 hover:text-teal-800 font-semibold"
                  >
                    Backup code
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <p className="text-xs text-gray-600">
              Ainda não tem conta?{" "}
              <Link
                href="/auth/register"
                className="text-teal-700 hover:text-teal-800 font-semibold"
              >
                Criar conta
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
        {IMAGES.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt="Casa"
            fill
            className={`object-cover transition-opacity duration-700 ${
              i === idx ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
    </main>
  );
}
