"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function VerifyEmailSentPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.55)] text-center">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Confirme seu e-mail
        </h1>
        <p className="text-sm text-slate-400 mb-4">
          Enviamos um link de confirmação para
          {" "}
          <span className="font-semibold text-slate-100">
            {email || "seu e-mail"}
          </span>
          .
        </p>
        <p className="text-xs text-slate-500 mb-6">
          Se você não encontrar o e-mail, verifique a caixa de spam ou promoções.
        </p>

        {message && (
          <div className="text-xs text-slate-200 bg-slate-800/60 border border-slate-600/60 rounded-lg px-3 py-2 mb-4">
            {message}
          </div>
        )}

        <button
          type="button"
          disabled={isSending || !email}
          onClick={handleResend}
          className="w-full inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed mb-3"
        >
          {isSending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
        </button>

        <p className="text-xs text-slate-500">
          Já confirmou?{" "}
          <Link
            href="/auth/signin"
            className="text-teal-300 hover:text-teal-200 font-semibold"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </main>
  );
}
