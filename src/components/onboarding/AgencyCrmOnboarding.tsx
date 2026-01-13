"use client";

import { useMemo } from "react";
import { Kanban, Users, Search, SlidersHorizontal, MessageSquare, Sparkles } from "lucide-react";
import OnboardingTour, { OnboardingStep, resetOnboarding } from "./OnboardingTour";

export const AGENCY_CRM_ONBOARDING_KEY = "zlw_onboarding_agency_crm_v1";

export function resetAgencyCrmOnboarding() {
  resetOnboarding(AGENCY_CRM_ONBOARDING_KEY);
}

export default function AgencyCrmOnboarding({
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
        title: "Bem-vindo ao CRM da imobiliária",
        description:
          "Aqui você acompanha todos os leads do time, encontra gargalos e redistribui responsáveis quando necessário. Vamos fazer um tour rápido.",
        icon: <Sparkles className="w-5 h-5 text-blue-500" />,
      },
      {
        id: "metrics",
        title: "Resumo do funil do time",
        description:
          "Esses números ajudam a identificar rapidamente: volume de leads, quantos chegaram agora e quantos estão sem responsável.",
        targetSelector: "[data-onboarding='agency-crm-metrics']",
        position: "bottom",
        icon: <Kanban className="w-5 h-5 text-purple-500" />,
      },
      {
        id: "search",
        title: "Busca e filtros",
        description:
          "Use busca + filtros por etapa e responsável para encontrar rapidamente um lead específico ou analisar uma parte do funil.",
        targetSelector: "[data-onboarding='agency-crm-filters']",
        position: "bottom",
        icon: <Search className="w-5 h-5 text-teal-500" />,
      },
      {
        id: "tabs",
        title: "Ativos vs fechados",
        description:
          "Troque entre leads ativos e fechados para acompanhar performance e histórico.",
        targetSelector: "[data-onboarding='agency-crm-tabs']",
        position: "bottom",
        icon: <SlidersHorizontal className="w-5 h-5 text-gray-700" />,
      },
      {
        id: "list",
        title: "Lista de leads",
        description:
          "Clique em um lead para abrir os detalhes. Como agência, você pode redistribuir responsáveis e acompanhar mensagens e eventos.",
        targetSelector: "[data-onboarding='agency-crm-leads-list']",
        position: "top",
        icon: <Users className="w-5 h-5 text-orange-500" />,
      },
      {
        id: "drawer",
        title: "Detalhes do lead",
        description:
          "Ao abrir um lead, você vê resumo, linha do tempo e mensagens. Na aba Gestão, redistribua o responsável quando necessário.",
        icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
      },
    ],
    []
  );

  return (
    <OnboardingTour
      steps={steps}
      storageKey={AGENCY_CRM_ONBOARDING_KEY}
      forceShow={forceShow}
      onComplete={onFinish}
      onSkip={onFinish}
    />
  );
}
