import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const email = session.user?.email;

    if (!userId && !email) {
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    const leads: any[] = await (prisma as any).lead.findMany({
      where: {
        OR: [
          userId ? { userId: String(userId) } : undefined,
          email ? { contact: { email: String(email) } } : undefined,
        ].filter(Boolean),
      },
      select: {
        id: true,
        clientChatToken: true,
        createdAt: true,
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            city: true,
            state: true,
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
          },
        },
        clientMessages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            createdAt: true,
            fromClient: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const chats = leads
      .filter((l) => !!l?.clientChatToken)
      .map((lead) => {
        const last = Array.isArray(lead.clientMessages) ? lead.clientMessages[0] : null;
        return {
          leadId: String(lead.id),
          token: String(lead.clientChatToken),
          createdAt: lead.createdAt,
          contactName: lead.contact?.name || "Você",
          contactEmail: lead.contact?.email || "",
          lastMessage: last?.content || undefined,
          lastMessageAt: last?.createdAt || undefined,
          lastMessageFromClient: typeof last?.fromClient === "boolean" ? last.fromClient : undefined,
          property: {
            id: String(lead.property?.id || ""),
            title: String(lead.property?.title || "Imóvel"),
            price: Number(lead.property?.price || 0),
            city: String(lead.property?.city || ""),
            state: String(lead.property?.state || ""),
            image: lead.property?.images?.[0]?.url || null,
          },
        };
      });

    return NextResponse.json({ success: true, chats });
  } catch (error) {
    console.error("Error fetching user chats:", error);
    return NextResponse.json({ error: "Não conseguimos carregar suas conversas." }, { status: 500 });
  }
}
