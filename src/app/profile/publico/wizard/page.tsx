import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfilePublicWizardClient, {
  type WizardInitialProfile,
} from "./ProfilePublicWizardClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Melhore seu perfil público | OggaHub",
  description: "Reescreva sua headline, bio e cobertura de atendimento em poucos passos.",
};

export default async function ProfilePublicWizardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;

  if (!userId) {
    redirect("/login?next=/profile/publico/wizard");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      image: true,
      phone: true,
      phoneVerifiedAt: true,
      publicSlug: true,
      publicHeadline: true,
      publicBio: true,
      publicCity: true,
      publicState: true,
      publicServiceAreas: true,
      publicWhatsApp: true,
      publicPhoneOptIn: true,
      publicInstagram: true,
      publicLinkedIn: true,
    } as never,
  });

  if (!user) {
    redirect("/profile");
  }

  const role = (user as { role: string }).role;
  if (role !== "REALTOR" && role !== "AGENCY") {
    redirect("/profile");
  }

  const initial: WizardInitialProfile = {
    name: String((user as { name: string | null }).name || ""),
    publicHeadline: String((user as { publicHeadline: string | null }).publicHeadline || ""),
    publicBio: String((user as { publicBio: string | null }).publicBio || ""),
    publicCity: String((user as { publicCity: string | null }).publicCity || ""),
    publicState: String((user as { publicState: string | null }).publicState || ""),
    publicServiceAreas: Array.isArray((user as { publicServiceAreas?: string[] }).publicServiceAreas)
      ? (user as { publicServiceAreas: string[] }).publicServiceAreas
      : [],
    publicWhatsApp: String((user as { publicWhatsApp: string | null }).publicWhatsApp || ""),
    publicPhoneOptIn: Boolean((user as { publicPhoneOptIn: boolean | null }).publicPhoneOptIn),
    publicInstagram: String((user as { publicInstagram: string | null }).publicInstagram || ""),
    publicLinkedIn: String((user as { publicLinkedIn: string | null }).publicLinkedIn || ""),
    hasVerifiedPhone: Boolean(
      (user as { phone: string | null; phoneVerifiedAt: Date | null }).phone &&
        (user as { phoneVerifiedAt: Date | null }).phoneVerifiedAt
    ),
    image: (user as { image: string | null }).image || null,
    publicSlug: (user as { publicSlug: string | null }).publicSlug || null,
    role: role as "REALTOR" | "AGENCY",
  };

  return <ProfilePublicWizardClient initial={initial} />;
}
