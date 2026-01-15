"use client";

import { useMemo } from "react";
import { Sparkles, Search, Users, Plus } from "lucide-react";
import OnboardingTour, { OnboardingStep, resetOnboarding } from "./OnboardingTour";

export const AGENCY_CLIENTS_ONBOARDING_KEY = "zlw_onboarding_agency_clients_v1";

export function resetAgencyClientsOnboarding() {
  resetOnboarding(AGENCY_CLIENTS_ONBOARDING_KEY);
}

export default function AgencyClientsOnboarding({
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
        title: "Bem-vindo aos clientes",
        description:
          "Aqui você organiza a base de clientes, registra preferências e acompanha o que cada cliente procura. Vamos fazer um tour rápido.",
        icon: <Sparkles className="w-5 h-5 text-blue-500" />,
      },
      {
        id: "filters",
        title: "Busca e filtros",
        description:
          "Use busca + filtro de status para encontrar rapidamente um cliente específico.",
        targetSelector: "[data-onboarding='agency-clients-filters']",
        position: "bottom",
        icon: <Search className="w-5 h-5 text-teal-600" />,
      },
      {
        id: "metrics",
        title: "Indicadores",
        description:
          "Veja rapidamente totais, ativos e pausados na seleção atual.",
        targetSelector: "[data-onboarding='agency-clients-metrics']",
        position: "bottom",
        icon: <Users className="w-5 h-5 text-emerald-600" />,
      },
      {
        id: "create",
        title: "Criar cliente",
        description:
          "Cadastre um novo cliente e já salve preferências (cidade, bairro, faixa de preço, tipos).",
        targetSelector: "[data-onboarding='agency-clients-create']",
        position: "left",
        icon: <Plus className="w-5 h-5 text-gray-700" />,
      },
      {
        id: "list",
        title: "Lista e detalhes",
        description:
          "Clique em um cliente para abrir os detalhes e editar preferências.",
        targetSelector: "[data-onboarding='agency-clients-list']",
        position: "top",
        icon: <Users className="w-5 h-5 text-orange-500" />,
      },
    ],
    []
  );

  return (
    <OnboardingTour
      steps={steps}
      storageKey={AGENCY_CLIENTS_ONBOARDING_KEY}
      forceShow={forceShow}
      onComplete={onFinish}
      onSkip={onFinish}
    />
  );
}
