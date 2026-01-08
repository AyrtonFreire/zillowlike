import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { buildPropertyPath } from "@/lib/slug";
import { notFound, permanentRedirect } from "next/navigation";


type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await (prisma as any).property.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      city: true,
      state: true,
      updatedAt: true,
    },
  });

  if (!property) {
    return {
      title: "Imóvel não encontrado",
      description: "O imóvel solicitado não foi encontrado.",
    };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://oggahub.com";
  const canonicalPath = buildPropertyPath(id, property.title);
  const url = `${base}${canonicalPath}`;
  const title = `${property.title} | OggaHub`;
  const description = `${String(property.description || "").slice(0, 160)}${String(property.description || "").length > 160 ? "..." : ""}`;

  return {
    title,
    description,
    alternates: { canonical: url },
  };
}

export default async function PropertyPage({ params }: PageProps) {
  const { id } = await params;
  const sp = await (arguments[0] as any)?.searchParams;
  const property = await (prisma as any).property.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!property) notFound();
  const canonicalPath = buildPropertyPath(id, property.title);
  const qp = sp && typeof sp === "object" ? new URLSearchParams(sp as any).toString() : "";
  permanentRedirect(`${canonicalPath}${qp ? `?${qp}` : ""}`);
}
