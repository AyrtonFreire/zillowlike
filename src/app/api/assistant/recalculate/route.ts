import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

const RecalculateSchema = z
  .object({
    realtorId: z.string().min(1).optional(),
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
