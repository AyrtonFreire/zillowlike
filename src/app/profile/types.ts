import { getPublicProfilePathByRole } from "@/lib/public-profile";

export type ProfileStats = {
  properties: number;
  favorites: number;
  leadsReceived: number;
  leadsSent: number;
};

export type BackupCodesSummary = {
  total: number;
  unused: number;
};

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  emailVerified: string | null;
  phone: string | null;
  phoneVerifiedAt: string | null;
  recoveryEmail?: string | null;
  recoveryEmailVerifiedAt?: string | null;
  backupCodes?: BackupCodesSummary;
  hasPassword?: boolean;
  stats: ProfileStats;
  publicSlug?: string | null;
  publicProfileEnabled?: boolean;
  publicHeadline?: string | null;
  publicBio?: string | null;
  publicCity?: string | null;
  publicState?: string | null;
  publicPhoneOptIn?: boolean;
  realtorCreci?: string | null;
  realtorCreciState?: string | null;
  realtorType?: "AUTONOMO" | "IMOBILIARIA" | string | null;
};

export type ProfileFormState = {
  name: string;
  publicProfileEnabled: boolean;
  publicHeadline: string;
  publicBio: string;
  publicCity: string;
  publicState: string;
  publicPhoneOptIn: boolean;
};

export type ProfileFieldErrors = Partial<Record<keyof ProfileFormState | "general", string>>;

export type InlineFeedback = {
  kind: "success" | "error" | "info";
  title: string;
  message?: string;
} | null;

export function buildProfileForm(profile?: UserProfile | null): ProfileFormState {
  return {
    name: profile?.name || "",
    publicProfileEnabled: Boolean(profile?.publicProfileEnabled),
    publicHeadline: profile?.publicHeadline || "",
    publicBio: profile?.publicBio || "",
    publicCity: profile?.publicCity || "",
    publicState: profile?.publicState || "",
    publicPhoneOptIn: Boolean(profile?.publicPhoneOptIn),
  };
}

export function isRealtorOrAgency(role?: string | null) {
  return role === "REALTOR" || role === "AGENCY";
}

export function isOwnerLike(role?: string | null) {
  return role === "OWNER" || role === "USER";
}

export function getPublicProfilePath(profile?: Pick<UserProfile, "role" | "publicSlug" | "publicProfileEnabled"> | null) {
  if (!profile?.publicSlug) return null;
  return getPublicProfilePathByRole(profile);
}

export function formatRoleLabel(role?: string | null) {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "REALTOR":
      return "Corretor";
    case "AGENCY":
      return "Agência";
    case "OWNER":
      return "Proprietário";
    case "USER":
      return "Usuário";
    default:
      return "Conta";
  }
}

export function formatRealtorTypeLabel(value?: string | null) {
  if (!value) return null;
  if (value === "AUTONOMO") return "Corretor(a) autônomo(a)";
  if (value === "IMOBILIARIA") return "Imobiliária";
  return value;
}

export function normalizeProfileForm(form: ProfileFormState): ProfileFormState {
  return {
    name: form.name.trim(),
    publicProfileEnabled: Boolean(form.publicProfileEnabled),
    publicHeadline: form.publicHeadline.trim(),
    publicBio: form.publicBio.trim(),
    publicCity: form.publicCity.trim(),
    publicState: form.publicState.trim().toUpperCase(),
    publicPhoneOptIn: Boolean(form.publicPhoneOptIn),
  };
}

export function areProfileFormsEqual(a: ProfileFormState, b: ProfileFormState) {
  const left = normalizeProfileForm(a);
  const right = normalizeProfileForm(b);

  return (
    left.name === right.name &&
    left.publicProfileEnabled === right.publicProfileEnabled &&
    left.publicHeadline === right.publicHeadline &&
    left.publicBio === right.publicBio &&
    left.publicCity === right.publicCity &&
    left.publicState === right.publicState &&
    left.publicPhoneOptIn === right.publicPhoneOptIn
  );
}
