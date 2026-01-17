"use client";

import { useParams } from "next/navigation";
import TeamChatPanel from "@/components/team-chat/TeamChatPanel";

export default function AgencyTeamCrmPage() {
  const params = useParams();
  const teamId = params?.id as string;

  return (
    <div className="py-2">
      <TeamChatPanel teamId={teamId} />
    </div>
  );
}
