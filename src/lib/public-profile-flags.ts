/**
 * Server-side feature flag resolution for the public profile redesign.
 *
 * Default: V2 is ON. Escape hatches to fall back to the legacy layout:
 *   - Cookie `ogga_profile_v2=0`
 *   - Env var `NEXT_PUBLIC_PROFILE_V2=0` (also `false`/`off`)
 *
 * Cookie takes precedence over env. Keep this module server-only — it reads
 * `next/headers` cookies.
 */

import { cookies } from "next/headers";

const COOKIE_NAME = "ogga_profile_v2";

function envForcesLegacy(): boolean {
  const value = process.env.NEXT_PUBLIC_PROFILE_V2;
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "off";
}

export async function isPublicProfileV2Enabled(): Promise<boolean> {
  try {
    const store = await cookies();
    const override = store.get(COOKIE_NAME)?.value;
    if (override === "0") return false;
    if (override === "1") return true;
  } catch {
    // cookies() may throw in some contexts; fall through to env.
  }
  return !envForcesLegacy();
}
