"use client";

import { LayoutDashboard, Users, Kanban, CheckSquare, Search, Lightbulb } from "lucide-react";
import OnboardingTour, { OnboardingStep, resetOnboarding } from "./OnboardingTour";

export const BROKER_ONBOARDING_KEY = "zlw_onboarding_broker_v2";

export function resetBrokerOnboarding() {
  resetOnboarding(BROKER_ONBOARDING_KEY);
}

const BROKER_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao seu painel! 👋",
    description:
      "Este é o seu espaço para gerenciar leads e acompanhar oportunidades. Vamos fazer um tour rápido para você conhecer as principais funcionalidades.",
    icon: <LayoutDashboard className="w-5 h-5 text-blue-500" />,
  },
  {
    id: "search",
    title: "Busca de Leads",
    description:
      "Use esta barra para buscar rapidamente um lead por nome do cliente, cidade ou título do imóvel. Ideal para acessar conversas em andamento.",
    targetSelector: "[data-onboarding='leads-section']",
    position: "bottom",
    icon: <Search className="w-5 h-5 text-teal-500" />,
  },
  {
    id: "pipeline",
    title: "Resumo do Funil",
    description:
      "Aqui você vê um resumo de onde estão seus leads: topo do funil (novos), em negociação (visitas e propostas) e resultados (fechados ou perdidos).",
    targetSelector: "[data-onboarding='pipeline-section']",
    position: "top",
    icon: <Kanban className="w-5 h-5 text-purple-500" />,
  },
  {
    id: "tasks",
    title: "Tarefas e Lembretes",
    description:
      "Os lembretes que você adicionar nos leads aparecem aqui. Use para organizar follow-ups e não esquecer de nenhum cliente!",
    targetSelector: "[data-onboarding='tasks-section']",
    position: "top",
    icon: <CheckSquare className="w-5 h-5 text-orange-500" />,
  },
  {
    id: "tips",
    title: "Dicas importantes",
    description:
      "• Acesse o Funil CRM pelo menu para ver e arrastar leads entre etapas\n• Use notas para registrar conversas e combinados\n• Configure lembretes para não esquecer follow-ups\n\nBoa sorte nas vendas! 🚀",
    icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
  },
];

export default function BrokerOnboarding() {
  return (
    <OnboardingTour
      steps={BROKER_ONBOARDING_STEPS}
      storageKey={BROKER_ONBOARDING_KEY}
      onComplete={() => {
        console.log("Broker onboarding completed");
      }}
    />
  );
}
