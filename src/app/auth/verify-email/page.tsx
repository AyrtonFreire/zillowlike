"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

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
    if (status === "success") {
      const id = setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
      return () => clearTimeout(id);
    }
  }, [status, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.55)] text-center">
        <h1 className="text-2xl font-semibold text-white mb-3">
          {status === "success" ? "E-mail confirmado" : "Confirmando e-mail"}
        </h1>
        <p className="text-sm text-slate-400 mb-4">
          {status === "loading"
            ? "Aguarde enquanto validamos seu link de confirmação."
            : message || ""}
        </p>

        {status !== "loading" && (
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Ir para a tela de login
          </Link>
        )}
      </div>
    </main>
  );
}
