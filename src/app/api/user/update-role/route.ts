import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateCRECI } from "@/lib/validators/creci";

const updateRoleSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("OWNER"),
  }),
  z.object({
    role: z.literal("REALTOR"),
    creci: z.string().trim().min(1),
    creciState: z.string().trim().toUpperCase().min(2).max(2),
    realtorType: z.enum(["AUTONOMO", "IMOBILIARIA"]),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.userId;
    const sessionRole = (session as any)?.role;
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (sessionRole === "ADMIN") {
      return NextResponse.json(
        { error: "Admins cannot change role via this endpoint" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateRoleSchema.parse(body);

    const role = parsed.role;
    const creci = role === "REALTOR" ? parsed.creci.trim() : undefined;
    const creciState = role === "REALTOR" ? parsed.creciState.trim().toUpperCase() : undefined;
    const realtorType = role === "REALTOR" ? parsed.realtorType : undefined;

    const current = await prisma.user.findUnique({
      where: { id: userId as string },
      select: { role: true },
    });

    if (current?.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admins cannot change role via this endpoint" },
        { status: 403 }
      );
    }

    // Se for promoção para REALTOR, exigir dados mínimos de identificação profissional
    if (role === "REALTOR") {
      const validation = validateCRECI(creci!, creciState!);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.message || "CRECI inválido" },
          { status: 400 }
        );
      }

      console.log("[USER UPDATE ROLE] Basic realtor registration data", {
        userId,
        creci,
        creciState,
        realtorType,
        warnings: validation.warnings || [],
      });
    }

    const data: any = { role };

    if (role === "REALTOR") {
      data.realtorCreci = creci;
      data.realtorCreciState = creciState;
      data.realtorType = realtorType;
    } else {
      data.realtorCreci = null;
      data.realtorCreciState = null;
      data.realtorType = null;
    }

    await prisma.user.update({
      where: { id: userId as string },
      data,
    });

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}
