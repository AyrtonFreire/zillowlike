import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const actorId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!actorId) {
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    if (role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Você não tem permissão para ver estes leads." }, { status: 403 });
    }

    const impersonateId = req.nextUrl.searchParams.get("userId");
    let ownerId = String(actorId);

    if (impersonateId) {
      if (role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      ownerId = String(impersonateId);
    }

    const recoveryRes = await requireRecoveryFactor(String(actorId));
    if (recoveryRes) return recoveryRes;

    const leads = await (prisma as any).lead.findMany({
      where: {
        property: {
          ownerId,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        pipelineStage: true,
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            city: true,
            state: true,
            neighborhood: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
              select: { url: true },
            },
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            createdAt: true,
            senderId: true,
          },
        },
        chatReadReceipts: {
          where: { userId: String(actorId) },
          select: { lastReadAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const normalized = (Array.isArray(leads) ? leads : []).map((lead: any) => {
      const latestMessage = Array.isArray(lead.messages) ? lead.messages[0] : null;
      const lastReadAt = Array.isArray(lead.chatReadReceipts) ? lead.chatReadReceipts[0]?.lastReadAt : null;

      const latestMessageAt = latestMessage?.createdAt ? new Date(latestMessage.createdAt) : null;
      const lastRead = lastReadAt ? new Date(lastReadAt) : null;

      const hasUnreadMessages =
        !!latestMessageAt &&
        (!lastRead || latestMessageAt.getTime() > lastRead.getTime()) &&
        String(latestMessage?.senderId || "") !== String(actorId);

      return {
        id: lead.id,
        status: lead.status,
        createdAt: lead.createdAt,
        pipelineStage: lead.pipelineStage,
        property: lead.property,
        contact: lead.contact,
        hasUnreadMessages,
        lastMessageAt: latestMessageAt ? latestMessageAt.toISOString() : null,
      };
    });

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error getting owner leads:", error);
    return NextResponse.json({ error: "Não conseguimos carregar seus leads agora." }, { status: 500 });
  }
}
