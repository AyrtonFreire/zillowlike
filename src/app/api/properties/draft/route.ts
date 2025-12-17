import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const anySession = session as any;
  const user = anySession.user as any | undefined;
  const userId = anySession.userId || user?.id || user?.sub || null;
  return userId || null;
}

// GET: retorna o rascunho atual do usuário (se existir)
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, draft: null }, { status: 401 });
    }

    const draft = await prisma.propertyDraft.findUnique({
      where: { userId },
    });

    return NextResponse.json({ success: true, draft });
  } catch (error) {
    console.error("Error fetching property draft:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch draft" }, { status: 500 });
  }
}

// PUT: salva ou atualiza o rascunho do usuário
export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const data = body?.data;
    const currentStep = typeof body?.currentStep === "number" ? body.currentStep : null;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const existing = await prisma.propertyDraft.findUnique({
      where: { userId },
      select: { data: true },
    });

    const existingData = (existing?.data || {}) as any;
    const incomingData = data as any;

    const existingGen = Number(existingData.aiDescriptionGenerations || 0);
    const incomingGen = Number(incomingData.aiDescriptionGenerations || 0);
    if (incomingGen < existingGen) {
      incomingData.aiDescriptionGenerations = existingGen;
    }

    if (typeof incomingData.aiGeneratedDescription === "undefined" && typeof existingData.aiGeneratedDescription !== "undefined") {
      incomingData.aiGeneratedDescription = existingData.aiGeneratedDescription;
    }

    const draft = await prisma.propertyDraft.upsert({
      where: { userId },
      update: {
        data: incomingData,
        currentStep,
      },
      create: {
        userId,
        data: incomingData,
        currentStep,
      },
    });

    return NextResponse.json({ success: true, draft });
  } catch (error) {
    console.error("Error saving property draft:", error);
    return NextResponse.json({ success: false, error: "Failed to save draft" }, { status: 500 });
  }
}

// DELETE: remove o rascunho do usuário
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await prisma.propertyDraft.delete({
      where: { userId },
    }).catch(() => undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting property draft:", error);
    return NextResponse.json({ success: false, error: "Failed to delete draft" }, { status: 500 });
  }
}
