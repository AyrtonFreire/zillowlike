"use client";

import { useParams } from "next/navigation";
import TeamChatPanel from "@/components/team-chat/TeamChatPanel";

export default function TeamCrmPage() {
  const params = useParams();
  const teamId = params?.id as string;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TeamChatPanel teamId={teamId} />
    </div>
  );
}
