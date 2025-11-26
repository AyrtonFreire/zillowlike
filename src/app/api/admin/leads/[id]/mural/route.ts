import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.user && !session?.userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const role = session.role || session.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    // block = true  -> força como lead direto (não vai ao mural)
    // block = false -> volta a permitir que o lead participe do mural, se status permitir
    const block = typeof body?.block === "boolean" ? body.block : true;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        isDirect: block,
      },
      select: {
        id: true,
        status: true,
        isDirect: true,
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    console.error("Error updating lead mural visibility from admin panel:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar visibilidade do lead no mural" },
      { status: 500 },
    );
  }
}
