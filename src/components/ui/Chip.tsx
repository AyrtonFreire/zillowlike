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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-stone-700 shadow-sm text-xs font-semibold uppercase tracking-wider hover:border-teal hover:text-teal-dark transition-all ${className}`}
    >
      {icon && <span className="text-teal">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
