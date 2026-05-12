"use client";

import type { LucideIcon } from "lucide-react";

type Tone = "rose" | "amber" | "purple" | "teal" | "emerald" | "sky" | "gray";

const TONE_CLASSES: Record<Tone, { container: string; label: string; value: string; subtext: string; iconBg: string; iconColor: string }> = {
  rose: {
    container: "border-rose-200 bg-rose-50/60",
    label: "text-rose-700",
    value: "text-rose-900",
    subtext: "text-rose-700/80",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  amber: {
    container: "border-amber-200 bg-amber-50/60",
    label: "text-amber-700",
    value: "text-amber-900",
    subtext: "text-amber-700/80",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  purple: {
    container: "border-purple-200 bg-purple-50/60",
    label: "text-purple-700",
    value: "text-purple-900",
    subtext: "text-purple-700/80",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
  teal: {
    container: "border-teal-200 bg-teal-50/60",
    label: "text-teal-700",
    value: "text-teal-900",
    subtext: "text-teal-700/80",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
  },
  emerald: {
    container: "border-emerald-200 bg-emerald-50/60",
    label: "text-emerald-700",
    value: "text-emerald-900",
    subtext: "text-emerald-700/80",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  sky: {
    container: "border-sky-200 bg-sky-50/60",
    label: "text-sky-700",
    value: "text-sky-900",
    subtext: "text-sky-700/80",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  gray: {
    container: "border-gray-200 bg-white",
    label: "text-gray-600",
    value: "text-gray-900",
    subtext: "text-gray-500",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  },
};

interface OfflineAssistantTileProps {
  label: string;
  value: number;
  subtext?: string | null;
  icon?: LucideIcon;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
}

export default function OfflineAssistantTile({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "gray",
  onClick,
  active = false,
}: OfflineAssistantTileProps) {
  const classes = TONE_CLASSES[tone];
  const Wrapper = onClick ? "button" : "div";
  const interactive = onClick
    ? "transition-shadow hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 text-left"
    : "";
  const activeRing = active && onClick ? "ring-2 ring-offset-1 ring-teal-500" : "";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-2xl border ${classes.container} ${interactive} ${activeRing} px-4 py-4 flex items-start gap-3 w-full`}
    >
      {Icon ? (
        <span className={`flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl ${classes.iconBg}`}>
          <Icon className={`w-5 h-5 ${classes.iconColor}`} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className={`text-[11px] font-semibold uppercase tracking-wide ${classes.label}`}>{label}</div>
        <div className={`mt-1 text-2xl font-bold tabular-nums ${classes.value}`}>{value}</div>
        {subtext ? <div className={`mt-0.5 text-xs ${classes.subtext}`}>{subtext}</div> : null}
      </div>
    </Wrapper>
  );
}
