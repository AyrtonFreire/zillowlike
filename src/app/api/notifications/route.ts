import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Mock notifications for now - integrate with database later
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Fetch from database
  const mockNotifications = [
    {
      id: "1",
      type: "lead",
      title: "Novo interesse recebido!",
      message: "João Silva demonstrou interesse no seu imóvel Casa 3 quartos...",
      link: "/owner/leads",
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
    },
    {
      id: "2",
      type: "favorite",
      title: "Imóvel favoritado",
      message: "Seu imóvel foi adicionado aos favoritos por 2 pessoas",
      link: "/owner/properties",
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    },
    {
      id: "3",
      type: "property",
      title: "Imóvel aprovado",
      message: "Seu imóvel foi aprovado e está visível na plataforma",
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
    },
  ];

  return NextResponse.json({ success: true, notifications: mockNotifications });
}
