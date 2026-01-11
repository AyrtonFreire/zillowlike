"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, X, Loader2, CheckCircle, RefreshCw, ArrowRight } from "lucide-react";

interface EmailChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (email: string) => void | Promise<void>;
  currentEmail: string;
}

export default function EmailChangeModal({
  isOpen,
  onClose,
  onVerified,
  currentEmail,
}: EmailChangeModalProps) {
  const [step, setStep] = useState<"edit" | "sending" | "input" | "verifying" | "success">("edit");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setStep("edit");
    setEmail("");
    setCode(["", "", "", "", "", ""]);
    setError(null);
    setCountdown(0);
  }, [isOpen]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendCode = async (targetEmail?: string) => {
    const normalized = String(targetEmail ?? email).toLowerCase().trim();
    if (!normalized) {
      setError("Informe um e-mail válido.");
      return;
    }

    setStep("sending");
    setError(null);

    try {
      const res = await fetch("/api/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao enviar e-mail");
      }

      setStep("input");
      setCountdown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar código");
      setStep("edit");
    }
  };

  const verifyCode = async (fullCode: string) => {
    setStep("verifying");
    setError(null);

    try {
      const res = await fetch("/api/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Código inválido");
      }

      const data = await res.json().catch(() => null);
      const newEmail = String(data?.email || "").toLowerCase().trim();

      setStep("success");

      setTimeout(async () => {
        await onVerified(newEmail);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Código inválido ou expirado");
      setStep("input");
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError(null);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const full = next.join("");
      if (full.length === 6) verifyCode(full);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const canResend = countdown === 0 && step === "input";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-7 text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Alterar e-mail</h2>
                  <p className="text-white/80 text-sm">Confirme a troca com um código enviado para o novo e-mail</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              {step === "edit" && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Seu e-mail atual:
                    <div className="mt-1 font-semibold text-gray-900 break-all">{currentEmail}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Novo e-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Vamos enviar um código para este endereço. A troca só acontece após confirmar o código.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => sendCode()}
                    className="w-full flex items-center justify-center gap-2 glass-teal text-white font-medium rounded-xl py-3 transition-colors"
                  >
                    Enviar código
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {(step === "sending" || step === "verifying") && (
                <div className="text-center py-10">
                  <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium">
                    {step === "sending" ? "Enviando código..." : "Verificando código..."}
                  </p>
                </div>
              )}

              {step === "input" && (
                <div className="space-y-5">
                  <div className="text-sm text-gray-600">
                    Enviamos um código de 6 dígitos para:
                    <div className="mt-1 font-semibold text-gray-900 break-all">{String(email).toLowerCase().trim()}</div>
                  </div>

                  <div className="flex justify-center gap-2">
                    {code.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => handleCodeChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-lg font-semibold border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        maxLength={1}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("edit");
                        setCode(["", "", "", "", "", ""]);
                        setError(null);
                        setCountdown(0);
                      }}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Trocar e-mail
                    </button>

                    <button
                      type="button"
                      disabled={!canResend}
                      onClick={() => sendCode(email)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 disabled:text-gray-400"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar código"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => verifyCode(code.join(""))}
                    disabled={code.join("").length !== 6}
                    className="w-full flex items-center justify-center gap-2 glass-teal text-white font-medium rounded-xl py-3 disabled:opacity-60"
                  >
                    Confirmar código
                  </button>
                </div>
              )}

              {step === "success" && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">E-mail atualizado!</h3>
                  <p className="text-gray-600 text-sm">Seu novo e-mail já pode ser usado para login.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
