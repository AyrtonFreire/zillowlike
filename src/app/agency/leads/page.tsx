import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveAgencyWorkspaceForUser } from "@/lib/agency-workspace";

export default async function AgencyLeadsIndexPage() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user && !session?.userId) {
    redirect("/api/auth/signin");
  }

  const userId = session.userId || session.user?.id;
  const role = session.role || session.user?.role;

  if (!userId) {
    redirect("/api/auth/signin");
  }

  const workspace = await resolveAgencyWorkspaceForUser({
    userId: String(userId),
    authRole: role ? String(role) : null,
  });

  if (!workspace.allowed || !workspace.teamId) {
    redirect("/");
  }

  const teamId = String(workspace.teamId);

  if (!teamId) {
    redirect("/agency/team");
  }

  redirect(`/agency/teams/${encodeURIComponent(teamId)}/crm`);
}
