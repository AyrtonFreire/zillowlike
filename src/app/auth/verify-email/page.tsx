"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000",
];

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("Link de verificação inválido.");
        return;
      }

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setStatus("error");
          setMessage(data?.error || "Não foi possível confirmar seu e-mail.");
        } else {
          setStatus("success");
          setMessage("Seu e-mail foi confirmado com sucesso.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Erro inesperado. Tente novamente.");
      }
    }

    run();
  }, [token]);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % IMAGES.length), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (status === "success") {
      const id = setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
      return () => clearTimeout(id);
    }
  }, [status, router]);

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

          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {status === "success" ? "E-mail confirmado" : "Confirmando e-mail"}
            </h1>
            <p className="text-sm text-gray-600">
              {status === "loading"
                ? "Aguarde enquanto validamos seu link de confirmação."
                : message || ""}
            </p>
          </div>

          <div className="space-y-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            {status !== "loading" && (
              <>
                <p className="text-sm text-gray-700">
                  {status === "success"
                    ? "Sua conta foi confirmada e já pode fazer login na plataforma."
                    : message || "Não foi possível confirmar seu e-mail."}
                </p>
                <Link
                  href="/auth/signin"
                  className="inline-flex w-full items-center justify-center gap-2 glass-teal text-white rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Ir para a tela de login
                </Link>
              </>
            )}

            {status === "loading" && (
              <p className="text-sm text-gray-700">
                Validando seu link de confirmação...
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="relative hidden lg:block overflow-hidden">
        {IMAGES.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt="Imóvel em destaque"
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
