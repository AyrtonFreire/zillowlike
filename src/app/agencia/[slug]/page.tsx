import type { Metadata } from "next";
import PublicProfessionalPageContent from "@/components/realtor/PublicProfessionalPageContent";
import { getPublicProfessionalPageData } from "@/lib/public-professional-profile";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const runtime = "nodejs";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicProfessionalPageData(slug);

  if (!data) {
    return {
      title: "Imobiliária não encontrada | OggaHub",
      description: "O perfil solicitado não está disponível.",
    };
  }

  return {
    title: data.metadata.title,
    description: data.metadata.description,
    alternates: {
      canonical: data.metadata.canonicalPath,
    },
  };
}

export default async function AgencyPublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  return <PublicProfessionalPageContent slug={slug} routeKind="agency" />;
}
