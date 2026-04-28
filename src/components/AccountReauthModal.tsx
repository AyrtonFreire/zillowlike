"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2, Mail, RefreshCw, ShieldCheck, X } from "lucide-react";

type Method = "password" | "email_code";

interface AccountReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  actionLabel: string;
  email?: string | null;
  hasPassword?: boolean;
}

export default function AccountReauthModal({
  isOpen,
  onClose,
  onSuccess,
  actionLabel,
  email,
  hasPassword = false,
}: AccountReauthModalProps) {
  const defaultMethod: Method = hasPassword ? "password" : "email_code";
  const [method, setMethod] = useState<Method>(defaultMethod);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setMethod(defaultMethod);
    setPassword("");
    setCode("");
    setError(null);
    setInfo(null);
    setLoading(false);
    setSendingCode(false);
    setCountdown(0);
  }, [defaultMethod, isOpen]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const maskedEmail = useMemo(() => {
    const value = String(email || "").trim();
    if (!value.includes("@")) return value || "seu e-mail principal";
    const [local, domain] = value.split("@");
    const visibleLocal = local.length <= 2 ? `${local.charAt(0)}*` : `${local.slice(0, 2)}***`;
    return `${visibleLocal}@${domain}`;
  }, [email]);

  const sendCode = async () => {
    setSendingCode(true);
    setError(null);
    setInfo(null);
    try {
      const response = await fetch("/api/auth/reauth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionLabel }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Não foi possível enviar o código agora.");
      }
      setCountdown(60);
      setInfo(`Enviamos um código para ${maskedEmail}.`);
      setMethod("email_code");
    } catch (nextError: any) {
      setError(nextError?.message || "Não foi possível enviar o código agora.");
    } finally {
      setSendingCode(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reauth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === "password"
            ? { method, password }
            : { method, code }
        ),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Não foi possível confirmar sua identidade.");
      }
      await onSuccess();
    } catch (nextError: any) {
      setError(nextError?.message || "Não foi possível confirmar sua identidade.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="relative bg-gradient-to-r from-teal-700 via-teal-700 to-emerald-600 px-6 py-7 text-white">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full p-1.5 transition-colors hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white/15 p-3">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Confirme sua identidade</h2>
                  <p className="mt-1 text-sm text-white/85">Precisamos confirmar que é você antes de {actionLabel.toLowerCase()}.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              {hasPassword ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("password");
                      setError(null);
                    }}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      method === "password"
                        ? "border-teal-600 bg-teal-50 text-teal-800"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    <KeyRound className="h-4 w-4" />
                    Senha atual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMethod("email_code");
                      setError(null);
                    }}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      method === "email_code"
                        ? "border-teal-600 bg-teal-50 text-teal-800"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    Código por e-mail
                  </button>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}

              {info ? (
                <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{info}</div>
              ) : null}

              {method === "password" ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-neutral-800">Digite sua senha atual</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha atual"
                    className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                  <p className="text-xs text-neutral-500">Use sua credencial atual para liberar ações críticas por alguns minutos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-800">Código enviado por e-mail</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm tracking-[0.2em] text-neutral-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-neutral-500">Vamos enviar o código para {maskedEmail}.</p>
                    <button
                      type="button"
                      onClick={() => void sendCode()}
                      disabled={sendingCode || countdown > 0}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 disabled:text-neutral-400"
                    >
                      {sendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {countdown > 0 ? `Reenviar em ${countdown}s` : "Enviar código"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4.5 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void verify()}
                  disabled={loading || (method === "password" ? password.length < 1 : code.length !== 6)}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-700 via-teal-700 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Confirmar identidade
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
