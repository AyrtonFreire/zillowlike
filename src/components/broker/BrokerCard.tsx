"use client";

import { type HTMLAttributes, type ReactNode, forwardRef } from "react";

type CardTone = "default" | "elevated" | "outlined" | "subtle";

interface BrokerCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: CardTone;
  interactive?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
  title?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
}

const TONE_STYLES: Record<CardTone, string> = {
  default: "bg-white border border-gray-200 shadow-sm",
  elevated: "bg-white border border-gray-200 shadow-md",
  outlined: "bg-white border border-gray-200",
  subtle: "bg-slate-50/70 border border-slate-200/80",
};

const PADDING_STYLES: Record<NonNullable<BrokerCardProps["padding"]>, string> = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

const BrokerCard = forwardRef<HTMLDivElement, BrokerCardProps>(function BrokerCard(
  { tone = "default", interactive = false, padding = "md", title, action, eyebrow, description, className = "", children, ...rest },
  ref,
) {
  const hasHeader = Boolean(title || action || eyebrow);

  return (
    <div
      ref={ref}
      className={`rounded-2xl ${TONE_STYLES[tone]} ${PADDING_STYLES[padding]} ${
        interactive ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" : ""
      } ${className}`.trim()}
      {...rest}
    >
      {hasHeader ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">{eyebrow}</div>
            ) : null}
            {title ? (
              <h3 className="text-base font-semibold text-gray-950">{title}</h3>
            ) : null}
            {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
});

export default BrokerCard;
