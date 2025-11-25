"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector do elemento a destacar
  position?: "top" | "bottom" | "left" | "right";
  icon?: ReactNode;
}

interface OnboardingTourProps {
  steps: OnboardingStep[];
  storageKey: string; // Chave para salvar no localStorage
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function OnboardingTour({
  steps,
  storageKey,
  onComplete,
  onSkip,
}: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Verificar se já completou o onboarding
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const completed = localStorage.getItem(storageKey);
      if (!completed) {
        // Pequeno delay para garantir que a página carregou
        const timer = setTimeout(() => setIsActive(true), 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage errors
    }
  }, [storageKey]);

  // Atualizar posição do elemento alvo
  useEffect(() => {
    if (!isActive || !steps[currentStep]?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const target = document.querySelector(steps[currentStep].targetSelector!);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, currentStep, steps]);

  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "completed");
    } catch {
      // Ignore storage errors
    }
    setIsActive(false);
    onComplete?.();
  }, [storageKey, onComplete]);

  const handleSkip = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "skipped");
    } catch {
      // Ignore storage errors
    }
    setIsActive(false);
    onSkip?.();
  }, [storageKey, onSkip]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isActive) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  // Calcular posição do tooltip
  const getTooltipPosition = () => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const position = step.position || "bottom";
    const padding = 16;

    switch (position) {
      case "top":
        return {
          top: `${targetRect.top - padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translate(-50%, -100%)",
        };
      case "bottom":
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translate(-50%, 0)",
        };
      case "left":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left - padding}px`,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding}px`,
          transform: "translate(0, -50%)",
        };
      default:
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translate(-50%, 0)",
        };
    }
  };

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay escuro com recorte para o elemento alvo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70000] pointer-events-auto"
            style={{
              background: targetRect
                ? `radial-gradient(ellipse 200px 150px at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent 0%, rgba(0,0,0,0.75) 100%)`
                : "rgba(0,0,0,0.75)",
            }}
            onClick={handleSkip}
          />

          {/* Highlight do elemento alvo */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-[70001] pointer-events-none"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                borderRadius: "12px",
                boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)",
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed z-[70002] bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5"
            style={getTooltipPosition()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {step.icon || <Sparkles className="w-5 h-5 text-blue-500" />}
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {currentStep + 1} de {steps.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSkip}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{step.description}</p>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? "bg-blue-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Pular tour
              </button>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isLast ? "Concluir" : "Próximo"}
                  {!isLast && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
