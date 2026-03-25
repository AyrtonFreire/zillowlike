"use client";
import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  optional?: boolean;
}

export default function Select({ label, error, className = "", children, ...props }: SelectProps) {
  const showRequired = !!props.required && !!label && !label.includes("*");
  return (
    <label className="block">
      {label && (
        <span className="block mb-1">
          <span className="text-sm font-semibold text-neutral-700">{label}</span>
          {showRequired && <span className="ml-1 text-sm font-semibold text-danger">*</span>}
        </span>
      )}
      <span className="relative block">
        <select
          {...props}
          className={`w-full min-h-[48px] appearance-none rounded-xl border bg-white/95 px-4 py-3 pr-10 text-base text-neutral-900 shadow-sm transition hover:border-neutral-400 focus:border-transparent focus:ring-2 focus:ring-teal-500/20 sm:min-h-0 sm:py-2.5 sm:text-sm [&>option]:bg-white [&>option]:text-neutral-900 ${
            error ? "border-danger focus:ring-red-500/15" : "border-neutral-300"
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
