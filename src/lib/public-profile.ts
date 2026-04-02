export function isProfessionalPublicRole(role?: string | null) {
  return role === "REALTOR" || role === "AGENCY";
}

export function getPublicProfilePathByRole(params: {
  role?: string | null;
  publicSlug?: string | null;
  publicProfileEnabled?: boolean | null;
}) {
  const slug = String(params.publicSlug || "").trim();
  if (!slug) return null;

  if (params.role === "AGENCY") {
    return `/agencia/${slug}`;
  }

  if (params.role === "REALTOR") {
    return `/realtor/${slug}`;
  }

  if ((params.role === "OWNER" || params.role === "USER") && params.publicProfileEnabled) {
    return `/owner/${slug}`;
  }

  return null;
}
