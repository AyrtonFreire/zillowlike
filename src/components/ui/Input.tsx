"use client";
import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-neutral-700 mb-1">{label}</span>}
      <input
        {...props}
        className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-accent focus:border-transparent transition ${error ? 'border-danger' : 'border-neutral-300'} ${className}`}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
