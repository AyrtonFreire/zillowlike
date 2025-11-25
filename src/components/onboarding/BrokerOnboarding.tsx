"use client";

import { LayoutDashboard, Users, Kanban, MessageCircle, Bell } from "lucide-react";
import OnboardingTour, { OnboardingStep } from "./OnboardingTour";

const BROKER_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao seu painel! 👋",
    description:
      "Este é o seu espaço para gerenciar leads e acompanhar oportunidades. Vamos fazer um tour rápido para você conhecer as principais funcionalidades.",
    icon: <LayoutDashboard className="w-5 h-5 text-blue-500" />,
  },
  {
    id: "leads",
    title: "Seus Leads",
    description:
      "Aqui você vê todos os leads que chegaram para você. Cada card mostra o imóvel, o contato do cliente e há quanto tempo o lead foi criado.",
    targetSelector: "[data-onboarding='leads-section']",
    position: "bottom",
    icon: <Users className="w-5 h-5 text-green-500" />,
  },
  {
    id: "pipeline",
    title: "Funil de Vendas",
    description:
      "No funil você organiza seus leads por etapa: Novo, Em Contato, Visita, Proposta... Arraste os cards para mover entre etapas ou use o botão 'Avançar'.",
    targetSelector: "[data-onboarding='pipeline-link']",
    position: "bottom",
    icon: <Kanban className="w-5 h-5 text-purple-500" />,
  },
  {
    id: "messages",
    title: "Mensagens",
    description:
      "Centralize aqui todas as conversas com seus clientes e proprietários. Você receberá notificações quando houver novas mensagens.",
    targetSelector: "[data-onboarding='messages-link']",
    position: "bottom",
    icon: <MessageCircle className="w-5 h-5 text-blue-500" />,
  },
  {
    id: "notifications",
    title: "Notificações",
    description:
      "O sino no topo mostra quando há novidades: novos leads, mensagens ou lembretes. Fique de olho nele para não perder nada importante!",
    targetSelector: "[data-onboarding='notifications']",
    position: "left",
    icon: <Bell className="w-5 h-5 text-orange-500" />,
  },
  {
    id: "tips",
    title: "Dicas importantes",
    description:
      "• Use notas para registrar conversas e combinados\n• Configure lembretes para não esquecer follow-ups\n• O chat integrado funciona sem precisar passar seu WhatsApp\n\nBoa sorte nas vendas! 🚀",
    icon: <LayoutDashboard className="w-5 h-5 text-teal-500" />,
  },
];

export default function BrokerOnboarding() {
  return (
    <OnboardingTour
      steps={BROKER_ONBOARDING_STEPS}
      storageKey="zlw_onboarding_broker_v1"
      onComplete={() => {
        console.log("Broker onboarding completed");
      }}
    />
  );
}
