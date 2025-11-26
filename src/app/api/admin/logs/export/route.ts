import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(";") || str.includes("\n") || str.includes("\"")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session?.user && !session?.userId) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const role = session.role || session.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const levelParam = (searchParams.get("level") || "ALL").toUpperCase();
    const daysParam = parseInt(searchParams.get("days") || "7", 10);
    const allowedDays = [1, 7, 30, 90];
    const days = allowedDays.includes(daysParam) ? daysParam : 7;
    const limitParam = parseInt(searchParams.get("limit") || "2000", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 10000 ? limitParam : 2000;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = {
      createdAt: { gte: since },
    };

    if (["INFO", "WARN", "ERROR", "SUCCESS"].includes(levelParam) && levelParam !== "ALL") {
      where.level = levelParam;
    }

    const action = searchParams.get("action");
    if (action) {
      where.action = action;
    }

    const targetType = searchParams.get("targetType");
    if (targetType) {
      where.targetType = targetType;
    }

    const actorEmail = searchParams.get("actorEmail");
    if (actorEmail) {
      where.actorEmail = actorEmail;
    }

    const q = searchParams.get("q");
    if (q) {
      const term = q.trim();
      if (term) {
        where.OR = [
          { message: { contains: term, mode: "insensitive" } },
          { action: { contains: term, mode: "insensitive" } },
          { actorEmail: { contains: term, mode: "insensitive" } },
          { targetId: { contains: term, mode: "insensitive" } },
          { targetType: { contains: term, mode: "insensitive" } },
        ];
      }
    }

    const prismaAny = prisma as any;
    const logs = await prismaAny.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const header = [
      "id",
      "createdAt",
      "level",
      "action",
      "message",
      "actorEmail",
      "actorRole",
      "targetType",
      "targetId",
      "metadataJson",
    ];

    const rows = logs.map((log: any) => [
      escapeCsv(log.id),
      escapeCsv(log.createdAt.toISOString()),
      escapeCsv(log.level),
      escapeCsv(log.action),
      escapeCsv(log.message || ""),
      escapeCsv(log.actorEmail || ""),
      escapeCsv(log.actorRole || ""),
      escapeCsv(log.targetType || ""),
      escapeCsv(log.targetId || ""),
      escapeCsv(log.metadata ? JSON.stringify(log.metadata) : ""),
    ]);

    const csv = [header.join(";"), ...rows.map((r: string[]) => r.join(";"))].join("\n");

    const fileName = `audit-logs-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting admin audit logs CSV:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao exportar logs" },
      { status: 500 },
    );
  }
}
