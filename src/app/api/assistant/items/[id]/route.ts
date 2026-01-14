import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";
import { prisma } from "@/lib/prisma";
import { LeadEventService } from "@/lib/lead-event-service";

const PatchSchema = z
  .object({
    action: z.enum(["resolve", "dismiss", "snooze"]),
    minutes: z.number().int().positive().optional(),
  })
  .strict();

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const url = new URL(req.url);
    const reqContext = (url.searchParams.get("context") || (role === "AGENCY" ? "AGENCY" : "REALTOR"))
      .trim()
      .toUpperCase();

    let teamId: string | null = url.searchParams.get("teamId") || null;
    if (!teamId && role === "AGENCY") {
      const agencyProfile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      teamId = agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    let item;
    if (parsed.data.action === "resolve") {
      const previous: any = await (prisma as any).assistantItem.findFirst({
        where: {
          id: String(id),
          context: reqContext === "AGENCY" ? "AGENCY" : "REALTOR",
          ownerId: String(userId),
          ...(reqContext === "AGENCY" && teamId ? { teamId: String(teamId) } : {}),
        },
        select: {
          id: true,
          leadId: true,
          metadata: true,
        },
      });

      item = await RealtorAssistantService.resolve(String(userId), id, {
        context: reqContext === "AGENCY" ? "AGENCY" : "REALTOR",
        teamId: reqContext === "AGENCY" ? teamId || undefined : undefined,
      });

      try {
        const meta = (previous as any)?.metadata || null;
        const leadId = (previous as any)?.leadId ? String((previous as any).leadId) : "";
        const source = String((meta as any)?.source || "").toUpperCase();

        // Agency assistant: no side-effects on lead stage here.
        if (role !== "AGENCY" && source === "WHATSAPP" && leadId) {
          const lead: any = await (prisma as any).lead.findFirst({
            where: {
              id: leadId,
              realtorId: String(userId),
            },
            select: {
              id: true,
              pipelineStage: true,
              respondedAt: true,
            },
          });

          if (lead) {
            const fromStage = lead.pipelineStage ? String(lead.pipelineStage) : null;
            if (!fromStage || fromStage === "NEW") {
              await (prisma as any).lead.update({
                where: { id: leadId },
                data: {
                  pipelineStage: "CONTACT",
                  respondedAt: lead.respondedAt ? undefined : new Date(),
                },
                select: { id: true },
              });

              await LeadEventService.record({
                leadId,
                type: "STAGE_CHANGED",
                actorId: String(userId),
                actorRole: String(role || "REALTOR"),
                title: "Contato iniciado",
                fromStage,
                toStage: "CONTACT",
                metadata: {
                  source: "WHATSAPP",
                  viaAssistant: true,
                },
              });
            } else if (!lead.respondedAt) {
              await (prisma as any).lead.update({
                where: { id: leadId },
                data: { respondedAt: new Date() },
                select: { id: true },
              });
            }
          }
        }
      } catch {
        // ignore
      }
    } else if (parsed.data.action === "dismiss") {
      item = await RealtorAssistantService.dismiss(String(userId), id, {
        context: reqContext === "AGENCY" ? "AGENCY" : "REALTOR",
        teamId: reqContext === "AGENCY" ? teamId || undefined : undefined,
      });
    } else {
      const minutes = parsed.data.minutes ?? 60;
      item = await RealtorAssistantService.snooze(String(userId), id, minutes, {
        context: reqContext === "AGENCY" ? "AGENCY" : "REALTOR",
        teamId: reqContext === "AGENCY" ? teamId || undefined : undefined,
      });
    }

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    console.error("Error updating assistant item:", error);
    return NextResponse.json(
      { error: "Não conseguimos atualizar este item agora." },
      { status: 500 }
    );
  }
}
