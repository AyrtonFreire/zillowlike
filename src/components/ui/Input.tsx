"use client";
import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  optional?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const showRequired = !!props.required && !!label && !label.includes("*");
    return (
      <label className="block">
        {label && (
          <span className="block mb-1">
            <span className="text-sm font-semibold text-neutral-700">{label}</span>
            {showRequired && <span className="ml-1 text-sm font-semibold text-danger">*</span>}
          </span>
        )}
        <input
          {...props}
          ref={ref}
          className={`w-full min-h-[48px] rounded-xl border bg-white/95 px-4 py-3 text-base text-neutral-900 shadow-sm transition placeholder:text-neutral-400 hover:border-neutral-400 focus:border-transparent focus:ring-2 focus:ring-teal-500/20 sm:min-h-0 sm:py-2.5 sm:text-sm ${
            error ? "border-danger focus:ring-red-500/15" : "border-neutral-300"
          } ${className}`}
        />
        {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
      </label>
    );
  }
);

Input.displayName = "Input";

export default Input;
