import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    event: z.enum(["DRAFT_COPIED", "DRAFT_SENT", "DRAFT_EDITED"]),
    itemId: z.string().min(1),
    context: z.enum(["REALTOR", "AGENCY"]).optional(),
    teamId: z.string().min(1).optional(),
    leadId: z.string().min(1).optional(),
    itemType: z.string().min(1).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;
    const actorEmail = (session as any)?.user?.email ? String((session as any).user.email) : null;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    if (role !== "ADMIN" && role !== "REALTOR" && role !== "AGENCY") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const url = new URL(req.url);
    const ctxRaw = (parsed.data.context || url.searchParams.get("context") || (role === "AGENCY" ? "AGENCY" : "REALTOR"))
      .trim()
      .toUpperCase();
    const context = ctxRaw === "AGENCY" ? "AGENCY" : "REALTOR";

    let teamId: string | null = parsed.data.teamId ? String(parsed.data.teamId) : url.searchParams.get("teamId") || null;
    if (!teamId && role === "AGENCY" && context === "AGENCY") {
      const agencyProfile = await (prisma as any).agencyProfile.findUnique({
        where: { userId: String(userId) },
        select: { teamId: true },
      });
      teamId = agencyProfile?.teamId ? String(agencyProfile.teamId) : null;
    }

    if (role === "AGENCY" && context !== "AGENCY") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const item = await (prisma as any).assistantItem.findFirst({
      where: {
        id: String(parsed.data.itemId),
        context,
        ownerId: String(userId),
        ...(context === "AGENCY" && teamId ? { teamId: String(teamId) } : {}),
      },
      select: {
        id: true,
        leadId: true,
        type: true,
      },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const action =
      parsed.data.event === "DRAFT_COPIED"
        ? "ASSISTANT_DRAFT_COPIED"
        : parsed.data.event === "DRAFT_SENT"
          ? "ASSISTANT_DRAFT_SENT"
          : "ASSISTANT_DRAFT_EDITED";

    void createAuditLog({
      level: "INFO",
      action,
      message: "Assistant client-side event",
      actorId: String(userId),
      actorEmail,
      actorRole: String(role || ""),
      targetType: "AssistantItem",
      targetId: String(item.id),
      metadata: {
        context,
        teamId: context === "AGENCY" ? String(teamId || "") || null : null,
        leadId: parsed.data.leadId ? String(parsed.data.leadId) : item.leadId ? String(item.leadId) : null,
        itemType: parsed.data.itemType ? String(parsed.data.itemType) : item.type ? String(item.type) : null,
        event: parsed.data.event,
        ...(parsed.data.metadata ? { metadata: parsed.data.metadata } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording assistant event:", error);
    return NextResponse.json({ success: false, error: "Erro ao registrar evento" }, { status: 500 });
  }
}
