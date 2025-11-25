"use client";
import * as React from "react";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Checkbox({ label, className = "", ...props }: CheckboxProps) {
  return (
    <label className={`inline-flex items-start gap-3 min-h-[44px] py-2 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        {...props}
        className="h-5 w-5 mt-0.5 rounded border-neutral-300 text-accent focus:ring-2 focus:ring-accent"
      />
      {label && <span className="text-sm text-neutral-800 leading-relaxed">{label}</span>}
    </label>
  );
}
