"use client";
import * as React from "react";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Checkbox({ label, className = "", ...props }: CheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 rounded border-neutral-300 text-accent focus:ring-2 focus:ring-accent"
      />
      {label && <span className="text-sm text-neutral-800">{label}</span>}
    </label>
  );
}
