import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transformCloudinaryUrl } from "@/lib/cloudinary";

type PrewarmBody = {
  propertyId?: string;
};

const getSessionUserId = (session: any): string | null => {
  return (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub || null;
};

const withTimeout = async <T,>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(id);
  }
};

const warmUrl = async (url: string) => {
  await withTimeout(async (signal) => {
    const head = await fetch(url, { method: "HEAD", redirect: "follow", cache: "no-store", signal }).catch(() => null);
    if (head && head.ok) return;
    await fetch(url, { method: "GET", redirect: "follow", cache: "no-store", signal }).catch(() => null);
  }, 2500);
};

const runPool = async (items: string[], concurrency: number) => {
  const results: Array<{ url: string; ok: boolean }> = [];
  let idx = 0;

  const worker = async () => {
    while (idx < items.length) {
      const i = idx++;
      const url = items[i];
      try {
        await warmUrl(url);
        results.push({ url, ok: true });
      } catch {
        results.push({ url, ok: false });
      }
    }
  };

  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  const role = (session as any)?.user?.role || (session as any)?.role;

  if (!session || !userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as PrewarmBody | null;
  const propertyId = typeof body?.propertyId === "string" ? body.propertyId.trim() : "";

  if (!propertyId) {
    return NextResponse.json({ success: false, error: "propertyId required" }, { status: 400 });
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      ownerId: true,
      images: { select: { url: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!property) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const isAdmin = String(role || "").toUpperCase() === "ADMIN";
  if (!isAdmin && property.ownerId && String(property.ownerId) !== String(userId)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const baseUrls = (property.images || [])
    .map((img) => (typeof img?.url === "string" ? img.url.trim() : ""))
    .filter(Boolean)
    .slice(0, 2);

  const transforms = [
    "f_auto,q_auto:good,w_640,h_384,c_fill,g_auto",
    "f_auto,q_auto:good,w_960,h_576,c_fill,g_auto",
    "f_auto,q_auto:good,w_1200,h_675,c_fill,g_auto",
    "f_auto,q_auto:good,w_1800,h_1013,c_fill,g_auto",
  ];

  const targets: string[] = [];
  for (const src of baseUrls) {
    for (const t of transforms) {
      const derived = transformCloudinaryUrl(src, t);
      if (derived && derived !== src) targets.push(derived);
    }
  }

  const uniqueTargets = Array.from(new Set(targets));
  const results = await runPool(uniqueTargets, 4);

  return NextResponse.json({
    success: true,
    propertyId: property.id,
    warmed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    total: results.length,
  });
}
