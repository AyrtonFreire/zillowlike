"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  className?: string;
  iconColor?: string;
  iconBgColor?: string;
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  className = "",
  iconColor = "text-blue-600",
  iconBgColor = "bg-blue-50",
}: MetricCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-gray-500 truncate">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-xs font-semibold ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:inline">vs. semana passada</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl ${iconBgColor} flex-shrink-0`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
