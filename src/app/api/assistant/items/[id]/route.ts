import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { RealtorAssistantService } from "@/lib/realtor-assistant-service";

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

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    let item;
    if (parsed.data.action === "resolve") {
      item = await RealtorAssistantService.resolve(String(userId), id);
    } else if (parsed.data.action === "dismiss") {
      item = await RealtorAssistantService.dismiss(String(userId), id);
    } else {
      const minutes = parsed.data.minutes ?? 60;
      item = await RealtorAssistantService.snooze(String(userId), id, minutes);
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
