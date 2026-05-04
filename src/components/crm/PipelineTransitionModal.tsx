"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import {
  LEAD_LOST_REASON_OPTIONS,
  LEAD_WON_REASON_OPTIONS,
  PIPELINE_STAGE_META,
  transitionRequiresReason,
  type CanonicalPipelineStage,
  type LeadLostReasonValue,
  type LeadWonReasonValue,
} from "@/lib/lead-pipeline";

export type PipelineTransitionPayload = {
  transitionReason?: string;
  note?: string;
  lostReason?: LeadLostReasonValue | null;
  wonReason?: LeadWonReasonValue | null;
  applyAutomation: boolean;
};

export default function PipelineTransitionModal({
  isOpen,
  currentStage,
  nextStage,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  currentStage: CanonicalPipelineStage | null;
  nextStage: CanonicalPipelineStage | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: PipelineTransitionPayload) => void | Promise<void>;
}) {
  const [transitionReason, setTransitionReason] = useState("");
  const [note, setNote] = useState("");
  const [lostReason, setLostReason] = useState<LeadLostReasonValue | "">("");
  const [wonReason, setWonReason] = useState<LeadWonReasonValue | "">("");
  const [applyAutomation, setApplyAutomation] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setTransitionReason("");
    setNote("");
    setLostReason("");
    setWonReason("");
    setApplyAutomation(true);
  }, [isOpen, currentStage, nextStage]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, isSubmitting, onClose]);

  const currentMeta = currentStage ? PIPELINE_STAGE_META[currentStage] : null;
  const nextMeta = nextStage ? PIPELINE_STAGE_META[nextStage] : null;
  const needsReason = transitionRequiresReason(currentStage, nextStage);
  const needsLostReason = nextStage === "LOST";
  const needsWonReason = nextStage === "WON";
  const canSubmit = useMemo(() => {
    if (!nextStage) return false;
    if (needsReason && !transitionReason.trim()) return false;
    if (needsLostReason && !lostReason) return false;
    if (needsWonReason && !wonReason) return false;
    return true;
  }, [lostReason, needsLostReason, needsReason, needsWonReason, nextStage, transitionReason, wonReason]);

  const title = nextStage === "LOST"
    ? "Marcar lead como perdido"
    : nextStage === "WON"
      ? "Confirmar lead como ganho"
      : needsReason
        ? "Registrar mudança de etapa"
        : `Mover para ${nextMeta?.label || "etapa"}`;

  const subtitle = currentMeta && nextMeta
    ? `De ${currentMeta.label} para ${nextMeta.label}`
    : nextMeta?.description || "";

  return (
    <AnimatePresence>
      {isOpen && nextStage ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60020] bg-black/45 backdrop-blur-sm"
            onClick={() => {
              if (!isSubmitting) onClose();
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60021] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={!!isSubmitting}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                {(needsReason || needsLostReason || needsWonReason) && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Registre o contexto desta mudança para manter o funil fiel ao histórico comercial.
                  </div>
                )}

                {needsReason && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-800">Motivo da mudança</label>
                    <input
                      value={transitionReason}
                      onChange={(event) => setTransitionReason(event.target.value)}
                      maxLength={300}
                      placeholder="Ex.: cliente pediu reagendamento da visita"
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                )}

                {needsLostReason && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-800">Motivo de perda</label>
                    <select
                      value={lostReason}
                      onChange={(event) => setLostReason(event.target.value as LeadLostReasonValue | "")}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    >
                      <option value="">Selecione um motivo</option>
                      {LEAD_LOST_REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {needsWonReason && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-800">Motivo de ganho</label>
                    <select
                      value={wonReason}
                      onChange={(event) => setWonReason(event.target.value as LeadWonReasonValue | "")}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    >
                      <option value="">Selecione um motivo</option>
                      {LEAD_WON_REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-800">Nota opcional</label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={600}
                    placeholder="Adicione contexto útil para a próxima ação ou para a timeline do lead"
                    className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {nextStage !== "WON" && nextStage !== "LOST" && (
                  <label className="flex items-start gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={applyAutomation}
                      onChange={(event) => setApplyAutomation(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>
                      Aplicar automação desta etapa e atualizar a próxima ação sugerida.
                    </span>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={!!isSubmitting}
                  className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || !!isSubmitting}
                  onClick={() =>
                    void onSubmit({
                      transitionReason: transitionReason.trim() || undefined,
                      note: note.trim() || undefined,
                      lostReason: lostReason || null,
                      wonReason: wonReason || null,
                      applyAutomation,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirmar mudança
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
