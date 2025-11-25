"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, 
  X, 
  Loader2, 
  CheckCircle, 
  RefreshCw, 
  ShieldCheck,
  MessageSquare,
  ArrowRight
} from "lucide-react";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  phone: string;
  /** Se true, permite editar/trocar o telefone */
  allowEdit?: boolean;
  /** Callback quando o telefone for alterado */
  onPhoneChange?: (newPhone: string) => void;
}

export default function PhoneVerificationModal({
  isOpen,
  onClose,
  onVerified,
  phone,
  allowEdit = false,
  onPhoneChange,
}: PhoneVerificationModalProps) {
  const [step, setStep] = useState<"sending" | "input" | "verifying" | "success" | "edit">("sending");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [newPhone, setNewPhone] = useState(phone);
  const [savingPhone, setSavingPhone] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Enviar SMS automaticamente ao abrir
  useEffect(() => {
    if (isOpen && step === "sending") {
      sendCode();
    }
  }, [isOpen]);

  // Countdown para re-envio
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendCode = async () => {
    setStep("sending");
    setError(null);
    
    try {
      const res = await fetch("/api/phone/send-code", { method: "POST" });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao enviar SMS");
      }
      
      setStep("input");
      setCountdown(60); // 60 segundos para re-enviar
      // Focar no primeiro input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar código");
      setStep("input");
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Só aceita números
    const digit = value.replace(/\D/g, "").slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError(null);

    // Avançar para o próximo input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Se completou os 6 dígitos, verificar automaticamente
    if (digit && index === 5) {
      const fullCode = newCode.join("");
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      verifyCode(pasted);
    }
  };

  const verifyCode = async (codeStr: string) => {
    setStep("verifying");
    setError(null);

    try {
      const res = await fetch("/api/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeStr }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Código inválido");
      }

      setStep("success");
      
      // Aguardar animação e fechar
      setTimeout(() => {
        onVerified();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Código inválido ou expirado");
      setStep("input");
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const saveNewPhone = async () => {
    if (!newPhone.trim()) {
      setError("Digite um telefone válido");
      return;
    }

    setSavingPhone(true);
    setError(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone }),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar telefone");
      }

      onPhoneChange?.(newPhone);
      setStep("sending");
      sendCode();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar telefone");
    } finally {
      setSavingPhone(false);
    }
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-8 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Verificar telefone</h2>
                <p className="text-teal-100 text-sm mt-0.5">
                  Proteja seu anúncio com segurança
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Enviando SMS */}
            {step === "sending" && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-700 font-medium">Enviando código por SMS...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Para {formatPhone(phone)}
                </p>
              </div>
            )}

            {/* Input do código */}
            {step === "input" && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-full text-sm font-medium mb-4">
                    <MessageSquare className="w-4 h-4" />
                    SMS enviado!
                  </div>
                  <p className="text-gray-600 text-sm">
                    Digite o código de 6 dígitos enviado para
                  </p>
                  <p className="font-semibold text-gray-900 mt-1">
                    {formatPhone(phone)}
                  </p>
                  {allowEdit && (
                    <button
                      onClick={() => setStep("edit")}
                      className="text-teal-600 text-sm hover:underline mt-2"
                    >
                      Usar outro número
                    </button>
                  )}
                </div>

                {/* Inputs do código */}
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {code.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all
                        ${error ? "border-red-300 bg-red-50" : "border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"}
                        outline-none`}
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-center text-sm text-red-600 bg-red-50 py-2 px-4 rounded-lg">
                    {error}
                  </p>
                )}

                {/* Re-enviar */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-gray-500">
                      Reenviar código em <span className="font-medium text-gray-700">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={sendCode}
                      className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 text-sm font-medium"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reenviar código
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Verificando */}
            {step === "verifying" && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-700 font-medium">Verificando código...</p>
              </div>
            )}

            {/* Sucesso */}
            {step === "success" && (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                </motion.div>
                <p className="text-gray-900 font-semibold text-lg">Telefone verificado!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Agora você pode publicar seu anúncio
                </p>
              </div>
            )}

            {/* Editar telefone */}
            {step === "edit" && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-gray-600 text-sm">
                    Digite o novo número de telefone
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Telefone (com DDD)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="11999999999"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Digite apenas números (DDD + número)
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 py-2 px-4 rounded-lg">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep("input")}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={saveNewPhone}
                    disabled={savingPhone || !newPhone.trim()}
                    className="flex-1 py-3 px-4 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingPhone ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Salvar e verificar
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer info */}
          {(step === "input" || step === "edit") && (
            <div className="px-6 pb-6">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500">
                  A verificação por SMS garante que apenas você possa publicar anúncios
                  e receber contatos de interessados no seu telefone.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
