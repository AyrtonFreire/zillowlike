"use client";
import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export default function Select({ label, error, className = "", children, ...props }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-neutral-700 mb-1">{label}</span>}
      <select
        {...props}
        className={`w-full px-4 py-2.5 rounded-lg border bg-white focus:ring-2 focus:ring-accent focus:border-transparent transition ${error ? 'border-danger' : 'border-neutral-300'} ${className}`}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
