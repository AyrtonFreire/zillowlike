"use client";
import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export default function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`mx-auto flex w-full max-w-2xl flex-col items-center text-center ${compact ? "py-8" : "py-12"}`}>
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 ring-1 ring-gray-200">
          {icon}
        </div>
      )}
      <div className="max-w-xl">
        <h3 className="text-xl font-semibold tracking-tight text-gray-900 md:text-2xl">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">{description}</p>
      </div>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
