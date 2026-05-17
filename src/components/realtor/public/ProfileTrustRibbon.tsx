import type { TrustBadgeVM } from "@/lib/public-profile-viewmodel";
import ProfileTrustBadge from "./ProfileTrustBadge";

const MAX_BADGES_VISIBLE = 5;

export default function ProfileTrustRibbon({
  badges,
  className = "",
}: {
  badges: TrustBadgeVM[];
  className?: string;
}) {
  // Already sorted by weight desc in computeBadges; do not re-sort here.
  const visible = badges.slice(0, MAX_BADGES_VISIBLE);
  if (visible.length === 0) return null;

  return (
    <section
      aria-label="Selos de confiança"
      className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 xl:px-10 ${className}`}
    >
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible">
        {visible.map((badge) => (
          <ProfileTrustBadge key={badge.key} badge={badge} />
        ))}
      </div>
    </section>
  );
}
