/**
 * Server-side feature flag resolution for the public profile redesign.
 *
 * Precedence (highest first):
 *   1. Cookie `ogga_profile_v2` ("1" enables, "0" force-disables)
 *   2. Env var `NEXT_PUBLIC_PROFILE_V2` (any truthy value enables)
 *
 * Keep this module server-only — it reads `next/headers` cookies.
 */

import { cookies } from "next/headers";

const COOKIE_NAME = "ogga_profile_v2";

function readEnvFlag(): boolean {
  const value = process.env.NEXT_PUBLIC_PROFILE_V2;
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on";
}

export async function isPublicProfileV2Enabled(): Promise<boolean> {
  try {
    const store = await cookies();
    const override = store.get(COOKIE_NAME)?.value;
    if (override === "1") return true;
    if (override === "0") return false;
  } catch {
    // cookies() may throw in some contexts; fall through to env.
  }
  return readEnvFlag();
}
