"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

const IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000",
];

export default function VerifyEmailSentPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % IMAGES.length), 5000);
    return () => clearInterval(id);
  }, []);

  async function handleResend() {
    if (!email) return;
    setIsSending(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setMessage("Não foi possível reenviar agora. Tente novamente em alguns minutos.");
      } else {
        setMessage("Se o e-mail existir e ainda não estiver verificado, enviamos um novo link.");
      }
    } catch (err) {
      setMessage("Erro inesperado. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gray-50">
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg">
              <span className="text-white font-semibold text-lg">Z</span>
            </div>
            <span className="text-sm font-semibold tracking-[0.18em] uppercase text-gray-700">
              ZillowLike
            </span>
          </Link>

          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Confirme seu e-mail
            </h1>
            <p className="text-sm text-gray-600">
              Enviamos um link de confirmação para{" "}
              <span className="font-semibold text-gray-900">
                {email || "seu e-mail"}
              </span>
              . Verifique a caixa de entrada, spam ou promoções.
            </p>
          </div>

          <div className="space-y-4 bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            {message && (
              <div className="text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="button"
              disabled={isSending || !email}
              onClick={handleResend}
              className="w-full inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
            </button>

            <p className="text-xs text-gray-600">
              Já confirmou?{" "}
              <Link
                href="/auth/signin"
                className="text-teal-700 hover:text-teal-800 font-semibold"
              >
                Fazer login
              </Link>
            </p>
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
