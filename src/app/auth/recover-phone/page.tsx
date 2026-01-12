"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RecoverPhonePage() {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "code" | "success">("input");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendCode = async () => {
    setError(null);

    if (!phone.trim()) {
      setError("Informe um telefone válido.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/recovery/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível enviar o código.");
      }

      setStep("code");
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || "Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    setError(null);

    if (!phone.trim()) {
      setError("Informe um telefone válido.");
      return;
    }

    if (!code.trim()) {
      setError("Informe o código.");
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
      const res = await fetch("/api/recovery/phone/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Não foi possível redefinir sua senha.");
      }

      setStep("success");
      setTimeout(() => router.push("/auth/signin"), 2500);
    } catch (err: any) {
      setError(err.message || "Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const canResend = step === "code" && countdown === 0 && !isLoading;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
        <h1 className="text-2xl font-semibold text-white mb-2">Recuperar por telefone</h1>
        <p className="text-sm text-slate-400 mb-4">
          Se você perdeu acesso ao e-mail, use seu telefone verificado para redefinir a senha.
        </p>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {step === "success" ? (
          <div className="text-sm text-slate-200 bg-slate-800/70 border border-slate-600/70 rounded-lg px-3 py-3">
            Sua senha foi redefinida com sucesso. Você será redirecionado para a tela de login.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(DDD) 9 9999-9999"
                className="w-full rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-400/70"
              />
            </div>

            {step === "code" && (
              <>
                <div className="text-[11px] text-slate-400">
                  Se existir uma conta com este telefone verificado, enviaremos um código por SMS.
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">Código</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full tracking-[0.35em] text-center rounded-lg border border-slate-700/70 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500/70 focus:border-teal-400/70"
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

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    disabled={!canResend}
                    onClick={sendCode}
                    className="text-xs text-teal-300 hover:text-teal-200 font-semibold disabled:opacity-60"
                  >
                    {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar código"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("input");
                      setCode("");
                      setPassword("");
                      setConfirmPassword("");
                      setCountdown(0);
                      setError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-300"
                  >
                    Trocar telefone
                  </button>
                </div>
              </>
            )}

            {step === "input" ? (
              <button
                type="button"
                disabled={isLoading}
                onClick={sendCode}
                className="w-full inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Enviando..." : "Enviar código"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={resetPassword}
                className="w-full inline-flex items-center justify-center gap-2 glass-teal text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Salvando..." : "Redefinir senha"}
              </button>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Prefere recuperar por e-mail?{" "}
          <Link href="/auth/forgot-password" className="text-teal-300 hover:text-teal-200 font-semibold">
            Solicitar link
          </Link>
        </p>

        <p className="mt-2 text-xs text-slate-500">
          Voltar para{" "}
          <Link href="/auth/signin" className="text-teal-300 hover:text-teal-200 font-semibold">
            login
          </Link>
        </p>
      </div>
    </main>
  );
}
