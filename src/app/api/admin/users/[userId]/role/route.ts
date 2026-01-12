import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_ACTIONS, createAuditLog } from "@/lib/audit-log";
import { z } from "zod";
import { requireRecoveryFactor } from "@/lib/recovery-factor";

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "REALTOR", "OWNER", "USER"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session as any)?.role;

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const recoveryRes = await requireRecoveryFactor(
      String((session as any).userId || (session as any).user?.id || "")
    );
    if (recoveryRes) return recoveryRes;

    const { userId } = await params;
    const body = await request.json();
    const { role } = updateRoleSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        email: true,
        name: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    try {
      await createAuditLog({
        level: "INFO",
        action: AUDIT_LOG_ACTIONS.ADMIN_USER_ROLE_CHANGE,
        message: "Admin alterou o papel de um usuário",
        actorId: (session as any).userId || (session as any).user?.id || null,
        actorEmail: (session as any).user?.email || null,
        actorRole: userRole,
        targetType: "USER",
        targetId: userId,
        metadata: {
          fromRole: existing.role,
          toRole: updatedUser.role,
          userEmail: updatedUser.email,
        },
      });
    } catch {}

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
