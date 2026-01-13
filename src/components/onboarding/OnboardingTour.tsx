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
  forceShow?: boolean; // Forçar exibição mesmo se já completado
}

// Helper para resetar o onboarding
export function resetOnboarding(storageKey: string) {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage errors
  }
}

export default function OnboardingTour({
  steps,
  storageKey,
  onComplete,
  onSkip,
  forceShow,
}: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Verificar se já completou o onboarding
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (forceShow) {
      setCurrentStep(0);
      const timer = setTimeout(() => setIsActive(true), 50);
      return () => clearTimeout(timer);
    }
    try {
      const completed = localStorage.getItem(storageKey);
      if (!completed) {
        const timer = setTimeout(() => setIsActive(true), 500);
        return () => clearTimeout(timer);
      }
    } catch {
    }
  }, [storageKey, forceShow]);

  // Atualizar posição do elemento alvo
  useEffect(() => {
    if (!isActive || !steps[currentStep]?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const target = document.querySelector(steps[currentStep].targetSelector!);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        // Elemento não encontrado - mostrar no centro
        setTargetRect(null);
      }
    };

    // Scroll para o elemento se ele existir
    const scrollToTarget = () => {
      const target = document.querySelector(steps[currentStep].targetSelector!);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        // Aguardar scroll terminar antes de atualizar posição
        setTimeout(updatePosition, 400);
      } else {
        updatePosition();
      }
    };

    scrollToTarget();
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

  // Calcular posição do tooltip - simplificado para mobile
  const getTooltipPosition = (): React.CSSProperties => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 640;
    
    // No mobile ou quando não tem alvo, centraliza na tela
    if (isMobile || !targetRect) {
      return { 
        top: "50%", 
        left: "50%", 
        transform: "translate(-50%, -50%)",
        width: "calc(100vw - 32px)",
        maxWidth: "400px",
      };
    }

    const position = step.position || "bottom";
    const padding = 16;
    const tooltipWidth = Math.min(380, viewportWidth - 32);
    const tooltipHeight = 280;

    let top = 0;
    let left = 0;
    let transformX = "-50%";
    let transformY = "0";

    switch (position) {
      case "top":
        top = targetRect.top - padding;
        left = targetRect.left + targetRect.width / 2;
        transformY = "-100%";
        break;
      case "bottom":
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2;
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - padding;
        transformX = "-100%";
        transformY = "-50%";
        break;
      case "right":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + padding;
        transformX = "0";
        transformY = "-50%";
        break;
      default:
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2;
    }

    // Ajustar se sair da tela horizontalmente
    const estimatedLeft = left - (transformX === "-50%" ? tooltipWidth / 2 : transformX === "-100%" ? tooltipWidth : 0);
    if (estimatedLeft < 16) {
      left = 16 + (transformX === "-50%" ? tooltipWidth / 2 : transformX === "-100%" ? tooltipWidth : 0);
    } else if (estimatedLeft + tooltipWidth > viewportWidth - 16) {
      left = viewportWidth - 16 - tooltipWidth + (transformX === "-50%" ? tooltipWidth / 2 : 0);
    }

    // Ajustar se sair da tela verticalmente
    if (top < 80) {
      top = targetRect.bottom + padding;
      transformY = "0";
    } else if (top + tooltipHeight > viewportHeight - 16) {
      top = targetRect.top - padding;
      transformY = "-100%";
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform: `translate(${transformX}, ${transformY})`,
      width: `${tooltipWidth}px`,
      maxWidth: "400px",
    };
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
            className="fixed z-[70002] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              ...getTooltipPosition(),
              maxHeight: "calc(100vh - 64px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - sempre visível */}
            <div className="flex items-start justify-between p-4 pb-2 shrink-0">
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

            {/* Content - scrollável se necessário */}
            <div className="px-4 overflow-y-auto flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{step.description}</p>
            </div>

            {/* Footer - sempre visível */}
            <div className="p-4 pt-3 shrink-0 border-t border-gray-100 mt-2">
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 mb-3">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentStep ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* Buttons */}
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
