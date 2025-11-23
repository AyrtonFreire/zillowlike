import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const targetType = url.searchParams.get("targetType");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (targetType && targetType !== "ALL") {
      where.targetType = targetType;
    }

    const reports = await (prisma as any).report.findMany({
      where,
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true, role: true, publicSlug: true },
        },
        property: {
          select: { id: true, title: true, city: true, state: true },
        },
        lead: {
          select: {
            id: true,
            status: true,
            property: {
              select: { id: true, title: true, city: true, state: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: reports.length,
      open: reports.filter((r: any) => r.status === "OPEN").length,
      inReview: reports.filter((r: any) => r.status === "IN_REVIEW").length,
      resolved: reports.filter((r: any) => r.status === "RESOLVED").length,
      dismissed: reports.filter((r: any) => r.status === "DISMISSED").length,
    };

    return NextResponse.json({ success: true, reports, stats });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar denúncias" },
      { status: 500 }
    );
  }
}
