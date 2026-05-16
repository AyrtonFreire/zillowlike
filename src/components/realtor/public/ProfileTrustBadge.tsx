import {
  Activity,
  Award,
  BadgeCheck,
  Building2,
  Clock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  TrustBadgeKey,
  TrustBadgeTone,
  TrustBadgeVM,
} from "@/lib/public-profile-viewmodel";

const ICON_BY_KEY: Record<TrustBadgeKey, LucideIcon> = {
  creciVerified: BadgeCheck,
  phoneVerified: ShieldCheck,
  fastResponder: Zap,
  sameDayResponder: Clock,
  topProducer: Trophy,
  risingStar: TrendingUp,
  yearsActive: Award,
  wideInventory: Building2,
  manyAreas: MapPin,
  wellReviewed: Star,
  recentlyActive: Activity,
  engagesReviews: MessageSquare,
  agencyTeam: Users,
};

const TONE_CLASSES: Record<TrustBadgeTone, string> = {
  trust: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  performance: "bg-amber-50 text-amber-800 ring-amber-200",
  scale: "bg-sky-50 text-sky-800 ring-sky-200",
  activity: "bg-violet-50 text-violet-800 ring-violet-200",
};

export default function ProfileTrustBadge({ badge }: { badge: TrustBadgeVM }) {
  const Icon = ICON_BY_KEY[badge.key];
  const toneClass = TONE_CLASSES[badge.tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${toneClass}`}
      title={badge.tooltip}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{badge.label}</span>
    </span>
  );
}
