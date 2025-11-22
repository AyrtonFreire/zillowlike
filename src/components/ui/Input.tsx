"use client";
import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  optional?: boolean;
}

export default function Input({ label, error, optional, className = "", ...props }: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="block mb-1">
          <span className="text-sm font-medium text-neutral-700">{label}</span>
          {optional && <span className="ml-2 text-xs font-normal text-neutral-400">Opcional</span>}
        </span>
      )}
      <input
        {...props}
        className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-accent focus:border-transparent transition ${error ? 'border-danger' : 'border-neutral-300'} ${className}`}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
