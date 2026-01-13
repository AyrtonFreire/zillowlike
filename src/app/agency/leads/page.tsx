import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  if (role !== "AGENCY" && role !== "ADMIN") {
    redirect("/");
  }

  let teamId: string | null = null;

  if (role === "AGENCY") {
    const profile = await (prisma as any).agencyProfile.findUnique({
      where: { userId: String(userId) },
      select: { teamId: true },
    });
    teamId = profile?.teamId ? String(profile.teamId) : null;
  }

  if (!teamId) {
    const membership = await (prisma as any).teamMember.findFirst({
      where: { userId: String(userId) },
      select: { teamId: true },
      orderBy: { createdAt: "asc" },
    });
    teamId = membership?.teamId ? String(membership.teamId) : null;
  }

  if (!teamId) {
    redirect("/agency/team");
  }

  redirect(`/agency/teams/${encodeURIComponent(teamId)}/crm`);
}
