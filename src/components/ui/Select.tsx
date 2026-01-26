"use client";
import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  optional?: boolean;
}

export default function Select({ label, error, optional: _optional, className = "", children, ...props }: SelectProps) {
  const showRequired = !!props.required && !!label && !label.includes("*");
  return (
    <label className="block">
      {label && (
        <span className="block mb-1">
          <span className="text-sm font-medium text-neutral-700">{label}</span>
          {showRequired && <span className="ml-1 text-sm font-semibold text-danger">*</span>}
        </span>
      )}
      <span className="relative block">
        <select
          {...props}
          className={`w-full appearance-none px-4 pr-10 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 text-base sm:text-sm rounded-lg border bg-white focus:ring-2 focus:ring-accent focus:border-transparent transition hover:border-neutral-400 ${
            error ? "border-danger" : "border-neutral-300"
          } ${className}`}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
