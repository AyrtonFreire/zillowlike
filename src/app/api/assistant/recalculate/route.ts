import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { prisma } from "@/lib/prisma";

const RecalculateSchema = z
  .object({
    realtorId: z.string().min(1).optional(),
    teamId: z.string().min(1).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = RecalculateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const targetRealtorId =
      role === "ADMIN" ? parsed.data.realtorId || String(userId) : String(userId);

    if (!targetRealtorId) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (role === "AGENCY") {
      const parsedTeamId = parsed.data.teamId ? String(parsed.data.teamId) : null;

      const teamId = parsedTeamId
        ? parsedTeamId
        : (() => {
            return null;
          })();

      const effectiveTeamId =
        teamId ||
        (await (async () => {
          const agencyProfile = await (prisma as any).agencyProfile.findUnique({
            where: { userId: String(userId) },
            select: { teamId: true },
          });
          return agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
        })());

      if (!effectiveTeamId) {
        return NextResponse.json({ error: "Não foi possível identificar o time da agência." }, { status: 400 });
      }

      const result = await RealtorAssistantService.recalculateForAgencyTeam(String(userId), effectiveTeamId);
      return NextResponse.json({ success: true, result });
    }

    const result = await RealtorAssistantService.recalculateForRealtor(targetRealtorId);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error recalculating assistant items:", error);
    return NextResponse.json(
      { error: "Não conseguimos recalcular o Assistente agora." },
      { status: 500 }
    );
  }
}
