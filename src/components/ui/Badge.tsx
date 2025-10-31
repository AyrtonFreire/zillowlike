import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "muted" | "success" | "warning" | "danger";
  children: React.ReactNode;
}

const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-neutral-100 text-neutral-800 border-neutral-200",
  muted: "bg-neutral-50 text-neutral-600 border-neutral-200",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
  danger: "bg-red-50 text-red-700 border-red-200",
};

export default function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span {...props} className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
