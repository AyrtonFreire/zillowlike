"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mail, Phone, ShieldCheck, X } from "lucide-react";

interface ContactManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasAnyVerifiedContact: boolean;
  phone: string | null;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  busyAction?: "phone" | "email" | "email-resend" | null;
  onManagePhone: () => void;
  onManageEmail: () => void;
  onResendEmailVerification: () => void;
}

function hasValue(value: string | null | undefined) {
  return Boolean(String(value || "").trim());
}

export default function ContactManagerModal({
  isOpen,
  onClose,
  hasAnyVerifiedContact,
  phone,
  phoneVerified,
  email,
  emailVerified,
  busyAction = null,
  onManagePhone,
  onManageEmail,
  onResendEmailVerification,
}: ContactManagerModalProps) {
  const phoneRegistered = hasValue(phone);
  const emailRegistered = hasValue(email);

  const phoneActionLabel = !phoneRegistered
    ? "Adicionar telefone"
    : phoneVerified
      ? "Alterar telefone"
      : "Verificar telefone";

  const emailActionLabel = !emailRegistered ? "Adicionar e-mail" : "Alterar e-mail";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-6 text-white sm:px-7">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full p-2 text-white/90 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white/15 p-3">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold sm:text-2xl">Gerenciar contatos</h2>
                  <p className="mt-1 text-sm text-white/85">
                    Cadastre ou verifique telefone e e-mail sem sair da postagem.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6 sm:px-7">
              <div
                className={`rounded-2xl border px-4 py-3 ${
                  hasAnyVerifiedContact
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <p className="text-sm font-semibold">
                  {hasAnyVerifiedContact
                    ? "Tudo certo para publicar"
                    : "Você precisa verificar pelo menos um canal"}
                </p>
                <p className="mt-1 text-sm opacity-90">
                  {hasAnyVerifiedContact
                    ? "A postagem será liberada automaticamente assim que você concluir qualquer atualização necessária."
                    : "Assim que telefone ou e-mail ficar verificado, a prévia será atualizada automaticamente e a publicação será liberada."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-teal-50 p-2 text-teal-700">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Telefone</p>
                        <p className="mt-1 text-sm text-gray-700 break-words">{phoneRegistered ? phone : "Não cadastrado"}</p>
                      </div>
                    </div>
                  </div>

                  <p className={`mt-3 text-xs font-medium ${phoneVerified ? "text-emerald-600" : phoneRegistered ? "text-amber-600" : "text-gray-500"}`}>
                    {phoneVerified ? "Verificado" : phoneRegistered ? "Pendente de verificação" : "Ainda não cadastrado"}
                  </p>

                  <button
                    type="button"
                    onClick={onManagePhone}
                    disabled={busyAction === "phone"}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
                  >
                    {busyAction === "phone" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {phoneActionLabel}
                  </button>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-teal-50 p-2 text-teal-700">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">E-mail</p>
                        <p className="mt-1 text-sm text-gray-700 break-all">{emailRegistered ? email : "Não cadastrado"}</p>
                      </div>
                    </div>
                  </div>

                  <p className={`mt-3 text-xs font-medium ${emailVerified ? "text-emerald-600" : emailRegistered ? "text-amber-600" : "text-gray-500"}`}>
                    {emailVerified ? "Verificado" : emailRegistered ? "Pendente de verificação" : "Ainda não cadastrado"}
                  </p>

                  <div className="mt-4 flex flex-col gap-2">
                    {emailRegistered && !emailVerified ? (
                      <button
                        type="button"
                        onClick={onResendEmailVerification}
                        disabled={busyAction === "email-resend"}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-60"
                      >
                        {busyAction === "email-resend" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Reenviar verificação
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={onManageEmail}
                      disabled={busyAction === "email"}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 disabled:opacity-60"
                    >
                      {busyAction === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {emailActionLabel}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
                Você permanece na tela do anúncio durante todo o processo. Quando concluir a alteração ou a verificação, esta etapa será atualizada automaticamente.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
