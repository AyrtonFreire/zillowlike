import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { getAuthResendVerificationEmail, sendEmail } from "@/lib/email";

/**
 * GET /api/user/profile
 * Get current user profile with stats
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        phone: true,
        phoneVerifiedAt: true,
        publicSlug: true,
        publicProfileEnabled: true,
        publicHeadline: true,
        publicBio: true,
        publicCity: true,
        publicState: true,
        publicPhoneOptIn: true,
        realtorCreci: true,
        realtorCreciState: true,
        realtorType: true,
        _count: {
          select: {
            leads: true,
            realtorLeads: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get property count if owner
    let propertyCount = 0;
    if (user.role === "OWNER") {
      propertyCount = await prisma.property.count({
        where: { ownerId: userId },
      });
    }

    // Get favorites count
    const favoritesCount = await prisma.favorite.count({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        stats: {
          properties: propertyCount,
          favorites: favoritesCount,
          leadsReceived: user._count.leads,
          leadsSent: user._count.realtorLeads,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update user profile
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const body = await req.json();

    const existing = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { phone: true, role: true, publicSlug: true, name: true, email: true },
    });

    // Only allow updating certain fields
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.email !== undefined) {
      const normalizedEmail = String(body.email || "").toLowerCase().trim();
      if (!normalizedEmail) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
      if ((existing as any)?.email !== normalizedEmail) {
        const conflict = await (prisma as any).user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
        if (conflict && conflict.id !== userId) {
          return NextResponse.json({ error: "Email already in use" }, { status: 400 });
        }
        updateData.email = normalizedEmail;
        updateData.emailVerified = null;
      }
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone;
      if (existing && existing.phone !== body.phone) {
        updateData.phoneVerifiedAt = null;
      }
    }

    const role = (existing as any)?.role as string | undefined;

    // Perfil público: para corretores/imobiliárias é sempre ativo;
    // para outros perfis continua opcional.
    if (role === "REALTOR" || role === "AGENCY") {
      updateData.publicProfileEnabled = true;
      if (!(existing as any).publicSlug) {
        const defaultBase = "corretor";
        const base = (body.name || (existing as any).name || defaultBase) as string;
        const slugBase = String(base)
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
        const random = Math.random().toString(36).slice(2, 6);
        updateData.publicSlug = `${slugBase || defaultBase}-${random}`;
      }
    } else if (body.publicProfileEnabled !== undefined) {
      updateData.publicProfileEnabled = Boolean(body.publicProfileEnabled);
      if (updateData.publicProfileEnabled && !(existing as any).publicSlug) {
        const defaultBase = "anunciante";
        const base = (body.name || (existing as any).name || defaultBase) as string;
        const slugBase = String(base)
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
        const random = Math.random().toString(36).slice(2, 6);
        updateData.publicSlug = `${slugBase || defaultBase}-${random}`;
      }
    }

    if (body.publicCity !== undefined) updateData.publicCity = body.publicCity;
    if (body.publicState !== undefined) updateData.publicState = body.publicState;

    if (role === "REALTOR" || role === "AGENCY") {
      if (body.publicHeadline !== undefined) updateData.publicHeadline = body.publicHeadline;
      if (body.publicBio !== undefined) updateData.publicBio = body.publicBio;
      if (body.publicPhoneOptIn !== undefined) updateData.publicPhoneOptIn = Boolean(body.publicPhoneOptIn);
    }

    const updated = await (prisma as any).user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        phone: true,
        phoneVerifiedAt: true,
        publicSlug: true,
        publicProfileEnabled: true,
        publicHeadline: true,
        publicBio: true,
        publicCity: true,
        publicState: true,
        publicPhoneOptIn: true,
        realtorCreci: true,
        realtorCreciState: true,
        realtorType: true,
      },
    });

    if (body.email !== undefined && (updateData.email || updateData.emailVerified === null)) {
      try {
        const token = randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

        await prisma.verificationToken.create({
          data: {
            identifier: String(updated.email).toLowerCase(),
            token,
            expires,
          },
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
        const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;
        const emailData = getAuthResendVerificationEmail({ verifyUrl });
        await sendEmail({ to: String(updated.email), subject: emailData.subject, html: emailData.html });
      } catch {
      }
    }

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
