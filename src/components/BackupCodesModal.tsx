"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, X, Loader2, CheckCircle, Copy } from "lucide-react";

interface BackupCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void | Promise<void>;
}

export default function BackupCodesModal({ isOpen, onClose, onGenerated }: BackupCodesModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [ack, setAck] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(false);
    setError(null);
    setCodes(null);
    setCopied(false);
    setAck(false);
  }, [isOpen]);

  const codesText = useMemo(() => {
    if (!codes?.length) return "";
    return codes.join("\n");
  }, [codes]);

  const generate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/backup-codes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Erro ao gerar códigos");
      }

      setCodes(Array.isArray(data.codes) ? data.codes : []);
      await onGenerated();
    } catch (err: any) {
      setError(err.message || "Erro ao gerar códigos");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!codesText) return;
    try {
      await navigator.clipboard.writeText(codesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setError("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

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
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
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
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Códigos de backup</h2>
                  <p className="text-white/80 text-sm">Recuperação sem e-mail/telefone</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
              )}

              {codes ? (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
                    Estes códigos serão exibidos apenas agora. Guarde em um local seguro. Cada código só pode ser usado uma vez.
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {codes.map((c) => (
                      <div
                        key={c}
                        className="font-mono text-xs px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-center"
                      >
                        {c}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={copy}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-medium"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? "Copiado" : "Copiar"}
                    </button>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={ack}
                        onChange={(e) => setAck(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      Eu salvei estes códigos
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={!ack}
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 glass-teal text-white font-medium rounded-xl py-3 disabled:opacity-60"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Concluir
                  </button>

                  <div className="text-xs text-gray-500">
                    Se você gerar novos códigos, os antigos serão invalidados.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-700">
                    Gere 10 códigos de backup para recuperar sua conta caso perca acesso ao e-mail e ao telefone.
                  </div>

                  <button
                    type="button"
                    onClick={generate}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 glass-teal text-white font-medium rounded-xl py-3 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      "Gerar códigos"
                    )}
                  </button>

                  <div className="text-xs text-gray-500">
                    Você poderá usar um backup code em /auth/recover-backup-code.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
