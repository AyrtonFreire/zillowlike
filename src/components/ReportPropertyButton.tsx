"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import Button from "./ui/Button";

type ReportReason =
  | "FAKE_LISTING"
  | "INAPPROPRIATE_PHOTO"
  | "SCAM"
  | "BAD_BEHAVIOR"
  | "BUG"
  | "OTHER";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "FAKE_LISTING", label: "Anúncio falso ou informações enganosas" },
  { value: "INAPPROPRIATE_PHOTO", label: "Fotos inadequadas" },
  { value: "SCAM", label: "Possível golpe ou fraude" },
  { value: "BAD_BEHAVIOR", label: "Comportamento abusivo do anunciante" },
  { value: "BUG", label: "Problema técnico nesta página" },
  { value: "OTHER", label: "Outro motivo" },
];

interface Props {
  propertyId: string;
  propertyTitle: string;
}

export default function ReportPropertyButton({ propertyId, propertyTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("FAKE_LISTING");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const minLength = 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!description || description.trim().length < minLength) {
      setError(`Descreva o que aconteceu em pelo menos ${minLength} caracteres.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "PROPERTY",
          targetId: propertyId,
          reason,
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Você precisa estar logado para enviar uma denúncia.");
        } else {
          setError("Não foi possível enviar sua denúncia agora. Tente novamente em instantes.");
        }
        return;
      }

      setSuccess("Denúncia enviada com sucesso. Obrigado por ajudar a manter a plataforma segura.");
      setDescription("");
      setReason("FAKE_LISTING");

      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 1800);
    } catch (err) {
      console.error("Erro ao enviar denúncia", err);
      setError("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:underline"
      >
        <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span>Denunciar anúncio</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-md w-full rounded-2xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Denunciar anúncio</h2>
                <p className="text-xs text-gray-600 truncate">{propertyTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Motivo</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-light focus:border-transparent bg-white"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Descrição
                  <span className="text-gray-400"> (mín. {minLength} caracteres)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Explique o que há de errado neste anúncio. Não compartilhe dados sensíveis."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-light focus:border-transparent"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
                  {success}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-gray-500 pr-2">
                  Usamos suas denúncias apenas para análise interna. Em casos graves, nossa equipe pode entrar em contato.
                </p>
                <Button
                  type="submit"
                  size="sm"
                  variant="danger"
                  loading={submitting}
                  className="whitespace-nowrap"
                >
                  Enviar denúncia
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

