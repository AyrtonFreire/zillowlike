import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  decryptAccountToken,
  fetchOlxJson,
  OLX_AUTUPLOAD_IMPORT_URL,
} from "@/lib/olx-api";

const Schema = z.object({
  propertyId: z.string().min(1),
  teamId: z.string().min(1).optional(),
});

function normalizeDigits(raw: string) {
  return String(raw || "")
    .trim()
    .replace(/\D/g, "");
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function priceToOlx(priceCents: any): number {
  try {
    const p = BigInt(priceCents);
    const brl = p / BigInt(100);
    return Number(brl);
  } catch {
    return Number(priceCents) || 0;
  }
}

function mapCategory(propertyType: string) {
  const t = String(propertyType || "").toUpperCase();
  if (t === "APARTMENT" || t === "CONDO" || t === "STUDIO") return 1020;
  if (t === "HOUSE" || t === "TOWNHOUSE") return 1040;
  if (t === "COMMERCIAL") return 1120;
  if (t === "LAND" || t === "RURAL") return 1100;
  return 1020;
}

function mapOlxType(purpose: string | null) {
  const p = String(purpose || "").toUpperCase();
  if (p === "RENT") return "u";
  return "s";
}

export async function POST(req: NextRequest) {
  const session: any = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = String(session.userId || session.user?.id || "");
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const teamId = parsed.data.teamId ? String(parsed.data.teamId) : null;

  let account: any = null;
  if (teamId) {
    const team = await (prisma as any).team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true },
    });
    if (!team) return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });

    const isOwner = String(team.ownerId) === userId;
    const isMember = await (prisma as any).teamMember.findFirst({
      where: { teamId: String(team.id), userId },
      select: { id: true },
    });
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    account = await (prisma as any).olxAccount.findUnique({ where: { teamId: String(team.id) } });
  } else {
    account = await (prisma as any).olxAccount.findUnique({ where: { userId } });
  }

  if (!account?.id) {
    return NextResponse.json({ error: "OLX account not connected" }, { status: 400 });
  }

  const property: any = await (prisma as any).property.findUnique({
    where: { id: parsed.data.propertyId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      owner: { select: { id: true, publicWhatsApp: true, phoneNormalized: true, phone: true } },
      team: { select: { id: true, ownerId: true } },
    },
  });

  if (!property?.id) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const images = Array.isArray(property.images)
    ? property.images.map((i: any) => String(i.url || "").trim()).filter(Boolean)
    : [];

  if (images.length === 0) {
    return NextResponse.json({ error: "Property has no images" }, { status: 400 });
  }

  const zipcode = normalizeDigits(String(property.postalCode || ""));
  if (!zipcode) {
    return NextResponse.json({ error: "Property missing postalCode" }, { status: 400 });
  }

  let phone = "";
  if (teamId) {
    const agencyProfile = await (prisma as any).agencyProfile.findUnique({
      where: { teamId },
      select: { phone: true, user: { select: { publicWhatsApp: true, phoneNormalized: true, phone: true } } },
    });
    phone = normalizeDigits(
      String(
        agencyProfile?.phone ||
          agencyProfile?.user?.publicWhatsApp ||
          agencyProfile?.user?.phoneNormalized ||
          agencyProfile?.user?.phone ||
          ""
      )
    );
  } else {
    phone = normalizeDigits(
      String(property.owner?.publicWhatsApp || property.owner?.phoneNormalized || property.owner?.phone || "")
    );
  }

  if (!phone) {
    return NextResponse.json({ error: "Missing phone for OLX ad" }, { status: 400 });
  }

  const category = mapCategory(String(property.type));
  const type = mapOlxType(property.purpose ? String(property.purpose) : null);
  const price = priceToOlx(property.price);

  const params: any = {};
  if (property.bedrooms != null) {
    const v = clampInt(Number(property.bedrooms), 0, 5);
    if (v !== null) params.rooms = String(v);
  }
  if (property.bathrooms != null) {
    const v = clampInt(Math.round(Number(property.bathrooms)), 1, 5);
    if (v !== null) params.bathrooms = String(v);
  }
  if (property.parkingSpots != null) {
    const v = clampInt(Number(property.parkingSpots), 0, 5);
    if (v !== null) params.garage_spaces = String(v);
  }
  if (property.areaM2 != null) {
    const v = clampInt(Number(property.areaM2), 1, 100000);
    if (v !== null) params.size = String(v);
  }

  const token = decryptAccountToken(String(account.accessTokenEnc));

  const olxAdId = String(property.id);

  const payload = {
    access_token: token,
    ad_list: [
      {
        id: olxAdId,
        operation: "insert",
        category,
        subject: String(property.title || "Imóvel").slice(0, 120),
        body: String(property.description || "").slice(0, 5000),
        phone: Number(phone),
        type,
        price,
        zipcode,
        phone_hidden: false,
        ...(Object.keys(params).length > 0 ? { params } : {}),
        images: images.slice(0, 20),
      },
    ],
  };

  const resp = await fetchOlxJson<any>(OLX_AUTUPLOAD_IMPORT_URL, {
    method: "PUT",
    body: payload,
  });

  const importToken = resp.data?.token ? String(resp.data.token) : null;

  const listing = await (prisma as any).olxListing.upsert({
    where: { accountId_propertyId: { accountId: String(account.id), propertyId: String(property.id) } },
    create: {
      accountId: String(account.id),
      propertyId: String(property.id),
      olxAdId,
      category,
      operation: "insert",
      lastImportToken: importToken,
      lastImportStatus: resp.data?.statusMessage ? String(resp.data.statusMessage) : null,
      raw: resp.data || payload,
    },
    update: {
      category,
      operation: "insert",
      lastImportToken: importToken || undefined,
      lastImportStatus: resp.data?.statusMessage ? String(resp.data.statusMessage) : undefined,
      raw: resp.data || payload,
    },
    select: { id: true, olxAdId: true, listId: true, lastImportToken: true, lastImportStatus: true },
  });

  return NextResponse.json({ success: true, listing, olx: resp.data });
}
