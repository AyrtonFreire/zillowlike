import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export function slugifyPublicProfileBase(value: string | null | undefined, fallback: string) {
  const normalized = String(value || fallback)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return normalized || fallback;
}

export async function generateUniquePublicSlug(userId: string, baseValue: string | null | undefined, fallback: string) {
  const base = slugifyPublicProfileBase(baseValue, fallback);

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
