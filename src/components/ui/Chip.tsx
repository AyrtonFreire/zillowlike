"use client";
import React from "react";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function Chip({ icon, className = "", children, ...props }: ChipProps) {
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-stone-700 shadow-sm text-xs font-semibold uppercase tracking-wider hover:border-emerald-600 hover:text-emerald-700 transition-all ${className}`}
    >
      {icon && <span className="text-emerald-600">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
