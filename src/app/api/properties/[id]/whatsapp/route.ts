import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

function normalizePhoneDigits(raw: string) {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return "";
  // If already includes country code (Brazil)
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = (session as any)?.user as any;
    const viewerId = (session as any)?.userId || sessionUser?.id || sessionUser?.sub;
    if (!viewerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { id: true, emailVerified: true },
    });

    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!viewer.emailVerified) {
      return NextResponse.json({ error: "Email not verified", code: "EMAIL_NOT_VERIFIED" }, { status: 403 });
    }

    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        hideOwnerContact: true,
        owner: {
          select: {
            id: true,
            phone: true,
            phoneVerifiedAt: true,
          } as any,
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const status = (property as any)?.status;
    const isActiveLike = status === "ACTIVE" || status === null || status === "" || typeof status === "undefined";
    if (!isActiveLike) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // If advertiser opted to hide contact, do not expose
    if ((property as any)?.hideOwnerContact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const owner = (property as any)?.owner as any;
    if (!owner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const hasVerifiedPhone = !!(owner.phone && owner.phoneVerifiedAt);
    if (!hasVerifiedPhone) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const phoneDigits = normalizePhoneDigits(owner.phone);
    if (!phoneDigits) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const origin = req.nextUrl.origin;
    const propertyUrl = `${origin}/property/${property.id}`;
    const text = encodeURIComponent(`Olá! Tenho interesse no imóvel: ${propertyUrl}`);
    const whatsappUrl = `https://wa.me/${phoneDigits}?text=${text}`;

    const res = NextResponse.json({ whatsappUrl });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.error("/api/properties/[id]/whatsapp GET error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
