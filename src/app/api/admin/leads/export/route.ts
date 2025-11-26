import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(";") || str.includes("\n") || str.includes('"')) {
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
    const daysParam = parseInt(searchParams.get("days") || "30", 10);
    const allowedDays = [7, 30, 90];
    const days = allowedDays.includes(daysParam) ? daysParam : 30;

    const sourceParam = (searchParams.get("source") || "all").toLowerCase();
    const source: "all" | "board" | "direct" =
      sourceParam === "board" || sourceParam === "direct" ? (sourceParam as any) : "all";

    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = {
      createdAt: { gte: since },
    };
    if (source === "board") {
      where.isDirect = false;
    } else if (source === "direct") {
      where.isDirect = true;
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          select: {
            title: true,
            city: true,
            state: true,
            price: true,
          },
        },
        realtor: {
          select: {
            name: true,
            email: true,
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const header = [
      "id",
      "createdAt",
      "status",
      "isDirect",
      "propertyTitle",
      "city",
      "state",
      "price_cents",
      "realtorName",
      "realtorEmail",
      "contactName",
      "contactEmail",
      "contactPhone",
    ];

    const rows = leads.map((lead) => [
      escapeCsv(lead.id),
      escapeCsv(lead.createdAt.toISOString()),
      escapeCsv(lead.status),
      escapeCsv(lead.isDirect ? "direct" : "board"),
      escapeCsv(lead.property?.title || ""),
      escapeCsv(lead.property?.city || ""),
      escapeCsv(lead.property?.state || ""),
      escapeCsv(lead.property?.price ?? ""),
      escapeCsv(lead.realtor?.name || ""),
      escapeCsv(lead.realtor?.email || ""),
      escapeCsv(lead.contact?.name || ""),
      escapeCsv(lead.contact?.email || ""),
      escapeCsv(lead.contact?.phone || ""),
    ]);

    const csv = [header.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const fileName = `leads-${days}d-${source}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      },
    });
  } catch (error) {
    console.error("Error exporting admin leads CSV:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao exportar leads" },
      { status: 500 },
    );
  }
}
