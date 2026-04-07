import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { normalizePhoneE164 } from "@/lib/sms";
import { z } from "zod";

const normalizeOptionalText = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalState = (value: unknown) => {
  const normalized = normalizeOptionalText(value);
  if (typeof normalized !== "string") return normalized;
  return normalized.toUpperCase();
};

const normalizeName = (value: unknown) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return value;
  return value.trim();
};

const profilePatchSchema = z.object({
  name: z.preprocess(
    normalizeName,
    z.string().min(2, "Informe seu nome completo.").max(120, "O nome pode ter no máximo 120 caracteres.").optional()
  ),
  image: z.preprocess(
    normalizeOptionalText,
    z.union([
      z.string().url("Informe uma URL de imagem válida.").max(2048, "A URL da imagem é muito longa."),
      z.null(),
    ]).optional()
  ),
  phone: z.preprocess(
    normalizeOptionalText,
    z.union([z.string().max(32, "O telefone informado é muito longo."), z.null()]).optional()
  ),
  publicProfileEnabled: z.boolean().optional(),
  publicHeadline: z.preprocess(
    normalizeOptionalText,
    z.union([
      z.string().max(120, "A frase de apresentação pode ter no máximo 120 caracteres."),
      z.null(),
    ]).optional()
  ),
  publicBio: z.preprocess(
    normalizeOptionalText,
    z.union([z.string().max(500, "A bio pública pode ter no máximo 500 caracteres."), z.null()]).optional()
  ),
  publicCity: z.preprocess(
    normalizeOptionalText,
    z.union([z.string().max(80, "A cidade pode ter no máximo 80 caracteres."), z.null()]).optional()
  ),
  publicState: z.preprocess(
    normalizeOptionalState,
    z.union([
      z.string().regex(/^[A-Z]{2}$/, "Informe a UF com 2 letras.").max(2, "Informe a UF com 2 letras."),
      z.null(),
    ]).optional()
  ),
  publicPhoneOptIn: z.boolean().optional(),
}).strict();

function slugifyProfileBase(value: string | null | undefined, fallback: string) {
  const normalized = String(value || fallback)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return normalized || fallback;
}

async function generateUniquePublicSlug(userId: string, baseValue: string | null | undefined, fallback: string) {
  const base = slugifyProfileBase(baseValue, fallback);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = randomBytes(2).toString("hex");
    const candidate = `${base}-${suffix}`;

    const existing = await (prisma as any).user.findFirst({
      where: {
        publicSlug: candidate,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString(36)}`;
}

async function buildProfileUserPayload(userId: string) {
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      emailVerified: true,
      passwordHash: true,
      phone: true,
      phoneVerifiedAt: true,
      recoveryEmail: true,
      recoveryEmailVerifiedAt: true,
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
    return null;
  }

  let propertyCount = 0;
  if (user.role === "OWNER") {
    propertyCount = await prisma.property.count({
      where: { ownerId: userId },
    });
  }

  const favoritesCount = await prisma.favorite.count({
    where: { userId },
  });

  const backupCodesTotal = await (prisma as any).backupRecoveryCode.count({
    where: { userId },
  });
  const backupCodesUnused = await (prisma as any).backupRecoveryCode.count({
    where: { userId, usedAt: null },
  });

  return {
    ...user,
    hasPassword: Boolean((user as any).passwordHash),
    passwordHash: undefined,
    backupCodes: {
      total: backupCodesTotal,
      unused: backupCodesUnused,
    },
    stats: {
      properties: propertyCount,
      favorites: favoritesCount,
      leadsReceived: user._count.leads,
      leadsSent: user._count.realtorLeads,
    },
  };
}

/**
 * GET /api/user/profile
 * Get current user profile with stats
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id;
    const user = userId ? await buildProfileUserPayload(String(userId)) : null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
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
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    if (body.recoveryEmail !== undefined || body.recoveryEmailVerifiedAt !== undefined) {
      return NextResponse.json({ error: "Use o fluxo de e-mail de recuperação para alterar esse campo." }, { status: 400 });
    }

    const parsed = profilePatchSchema.safeParse(body);

    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const firstFieldError = Object.values(flattened.fieldErrors).flat()[0];

      return NextResponse.json(
        {
          error: firstFieldError || flattened.formErrors[0] || "Os dados do perfil são inválidos.",
          fields: flattened.fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const existing = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        phoneNormalized: true,
        phoneVerifiedAt: true,
        role: true,
        publicSlug: true,
        name: true,
        email: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only allow updating certain fields
    const updateData: any = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.image !== undefined) updateData.image = payload.image;
    let phoneChanged = false;
    if (payload.phone !== undefined) {
      updateData.phone = payload.phone;

      const normalized = String(payload.phone || "").trim() ? normalizePhoneE164(String(payload.phone)) : "";
      updateData.phoneNormalized = normalized ? normalized : null;

      if (normalized) {
        const conflict = await (prisma as any).user.findFirst({
          where: {
            phoneNormalized: normalized,
            NOT: { id: userId },
          },
          select: { id: true },
        });
        if (conflict) {
          return NextResponse.json({ error: "Este telefone já está sendo usado por outra conta." }, { status: 400 });
        }
      }

      phoneChanged = existing.phone !== payload.phone || (existing as any).phoneNormalized !== updateData.phoneNormalized;

      if (phoneChanged) {
        updateData.phoneVerifiedAt = null;
      }
    }

    const role = (existing as any)?.role as string | undefined;
    const canExposeVerifiedPhone = Boolean(
      !phoneChanged &&
      String((payload.phone !== undefined ? payload.phone : existing.phone) || "").trim() &&
      (payload.phone === undefined ? existing.phoneVerifiedAt : !phoneChanged && existing.phoneVerifiedAt)
    );

    // Perfil público: para corretores/imobiliárias é sempre ativo;
    // para outros perfis continua opcional.
    if (role === "REALTOR" || role === "AGENCY") {
      updateData.publicProfileEnabled = true;
      if (!(existing as any).publicSlug) {
        const defaultBase = "corretor";
        updateData.publicSlug = await generateUniquePublicSlug(
          String(userId),
          (payload.name ?? (existing as any).name ?? defaultBase) as string,
          defaultBase
        );
      }
    } else if (payload.publicProfileEnabled !== undefined) {
      updateData.publicProfileEnabled = Boolean(payload.publicProfileEnabled);
      if (updateData.publicProfileEnabled && !(existing as any).publicSlug) {
        const defaultBase = "anunciante";
        updateData.publicSlug = await generateUniquePublicSlug(
          String(userId),
          (payload.name ?? (existing as any).name ?? defaultBase) as string,
          defaultBase
        );
      }
    }

    if (payload.publicCity !== undefined) updateData.publicCity = payload.publicCity;
    if (payload.publicState !== undefined) updateData.publicState = payload.publicState;

    if (role === "REALTOR" || role === "AGENCY") {
      if (payload.publicHeadline !== undefined) updateData.publicHeadline = payload.publicHeadline;
      if (payload.publicBio !== undefined) updateData.publicBio = payload.publicBio;
      if (payload.publicPhoneOptIn !== undefined) {
        updateData.publicPhoneOptIn = Boolean(payload.publicPhoneOptIn && canExposeVerifiedPhone);
      }
      if (phoneChanged) {
        updateData.publicPhoneOptIn = false;
      }
    }

    await (prisma as any).user.update({
      where: { id: userId },
      data: updateData,
    });

    const updated = await buildProfileUserPayload(String(userId));

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
