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
      className={`relative group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg text-xs font-semibold uppercase tracking-wider hover:shadow-xl transition-all ${className}`}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity -z-10"></span>
      {icon && <span className="relative z-10">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </span>
  );
}
