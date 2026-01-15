"use client";

import { useMemo } from "react";
import { Home, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import OnboardingTour, { OnboardingStep, resetOnboarding } from "./OnboardingTour";

export const AGENCY_PROPERTIES_ONBOARDING_KEY = "zlw_onboarding_agency_properties_v1";

export function resetAgencyPropertiesOnboarding() {
  resetOnboarding(AGENCY_PROPERTIES_ONBOARDING_KEY);
}

export default function AgencyPropertiesOnboarding({
  forceShow,
  onFinish,
}: {
  forceShow?: boolean;
  onFinish?: () => void;
}) {
  const steps = useMemo<OnboardingStep[]>(
    () => [
      {
        id: "welcome",
        title: "Bem-vindo aos imóveis",
        description:
          "Aqui você acompanha o estoque do time e identifica rapidamente quais anúncios precisam de atenção. Vamos fazer um tour rápido.",
        icon: <Sparkles className="w-5 h-5 text-blue-500" />,
      },
      {
        id: "summary",
        title: "Resumo rápido",
        description:
          "Veja quantos imóveis estão na seleção atual e como eles se dividem entre ativos e pausados.",
        targetSelector: "[data-onboarding='agency-properties-summary']",
        position: "bottom",
        icon: <Home className="w-5 h-5 text-emerald-600" />,
      },
      {
        id: "filters",
        title: "Busca e filtros",
        description:
          "Use busca + filtros por status e tipo para encontrar rapidamente um anúncio específico ou focar em uma parte do estoque.",
        targetSelector: "[data-onboarding='agency-properties-filters']",
        position: "bottom",
        icon: <Search className="w-5 h-5 text-teal-600" />,
      },
      {
        id: "list",
        title: "Lista de anúncios",
        description:
          "Cada card mostra métricas importantes e alertas (ex.: sem views, sem leads, baixa conversão).",
        targetSelector: "[data-onboarding='agency-properties-list']",
        position: "top",
        icon: <SlidersHorizontal className="w-5 h-5 text-gray-700" />,
      },
    ],
    []
  );

  return (
    <OnboardingTour
      steps={steps}
      storageKey={AGENCY_PROPERTIES_ONBOARDING_KEY}
      forceShow={forceShow}
      onComplete={onFinish}
      onSkip={onFinish}
    />
  );
}
