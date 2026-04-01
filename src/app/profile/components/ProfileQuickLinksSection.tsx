"use client";

import Link from "next/link";
import { Heart, Home, LayoutDashboard, MessageSquare, Bell, ArrowRight } from "lucide-react";
import { SectionCard } from "./ProfilePrimitives";

function getQuickLinks(role?: string | null) {
  if (role === "OWNER" || role === "USER") {
    return [
      { title: "Dashboard", description: "Acompanhe desempenho, leads e a qualidade dos seus anúncios.", href: "/owner/dashboard", icon: <LayoutDashboard className="h-5 w-5 text-teal-700" /> },
      { title: "Meus anúncios", description: "Crie, edite e publique imóveis sem sair do seu fluxo de trabalho.", href: "/owner/properties", icon: <Home className="h-5 w-5 text-indigo-700" /> },
      { title: "Meus leads", description: "Veja interessados, histórico e próximos passos das conversas.", href: "/owner/leads", icon: <MessageSquare className="h-5 w-5 text-emerald-700" /> },
      { title: "Favoritos", description: "Revise imóveis salvos e acompanhe oportunidades rapidamente.", href: "/favorites", icon: <Heart className="h-5 w-5 text-rose-700" /> },
    ];
  }

  return [
    { title: "Painel", description: "Tenha uma visão do funil, desempenho e rotina comercial.", href: "/broker/dashboard", icon: <LayoutDashboard className="h-5 w-5 text-teal-700" /> },
    { title: "Leads", description: "Gerencie leads, conversas e prioridades de atendimento.", href: "/broker/leads", icon: <MessageSquare className="h-5 w-5 text-emerald-700" /> },
    { title: "Imóveis", description: "Atualize captações, estoque e informações públicas dos imóveis.", href: "/broker/properties", icon: <Home className="h-5 w-5 text-indigo-700" /> },
    { title: "Comunicação", description: "Revise preferências e avisos para não perder contatos importantes.", href: "/account/communication", icon: <Bell className="h-5 w-5 text-amber-700" /> },
  ];
}

export function ProfileQuickLinksSection({ role }: { role?: string | null }) {
  const quickLinks = getQuickLinks(role);

  return (
    <SectionCard
      eyebrow="Atalhos"
      title="Continue de onde parou"
      description="Acesse as áreas de trabalho mais usadas sem percorrer a navegação inteira."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-50">
                {item.icon}
              </div>
              <ArrowRight className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-neutral-950">{item.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">{item.description}</p>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
