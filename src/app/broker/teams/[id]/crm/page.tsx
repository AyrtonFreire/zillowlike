"use client";

import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import TeamChatPanel from "@/components/team-chat/TeamChatPanel";

export default function TeamCrmPage() {
  const params = useParams();
  const teamId = params?.id as string;

  return (
    <DashboardLayout
      title="Conversas do time"
      description="Use o chat interno para falar com a imobiliária."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Corretor", href: "/broker/dashboard" },
        { label: "Meus times", href: "/broker/teams" },
        { label: "Conversas do time" },
      ]}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeamChatPanel teamId={teamId} />
      </div>
    </DashboardLayout>
  );
}
