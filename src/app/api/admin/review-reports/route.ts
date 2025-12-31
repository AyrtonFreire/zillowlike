import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const reports = await (prisma as any).reviewReport.findMany({
      where,
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        realtorRating: {
          select: {
            id: true,
            rating: true,
            comment: true,
            status: true,
            createdAt: true,
            realtor: { select: { id: true, name: true, publicSlug: true, role: true } },
            author: { select: { id: true, name: true, email: true } },
          },
        },
        ownerRating: {
          select: {
            id: true,
            rating: true,
            comment: true,
            status: true,
            createdAt: true,
            owner: { select: { id: true, name: true, publicSlug: true, role: true } },
            author: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    const stats = {
      total: reports.length,
      open: reports.filter((r: any) => r.status === "OPEN").length,
      resolved: reports.filter((r: any) => r.status === "RESOLVED").length,
      dismissed: reports.filter((r: any) => r.status === "DISMISSED").length,
    };

    return NextResponse.json({ success: true, reports, stats });
  } catch (error) {
    console.error("Error fetching review reports:", error);
    return NextResponse.json({ success: false, error: "Erro ao buscar denúncias" }, { status: 500 });
  }
}
