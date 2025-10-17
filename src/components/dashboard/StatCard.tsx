"use client";

import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function StatCard({
  title,
  children,
  action,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}
