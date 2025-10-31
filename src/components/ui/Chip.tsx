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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm text-sm text-neutral-700 ${className}`}
    >
      {icon && <span>{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
