"use client";
import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  optional?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, optional: _optional, className = "", ...props }, ref) => {
    const showRequired = !!props.required && !!label && !label.includes("*");
    return (
      <label className="block">
        {label && (
          <span className="block mb-1">
            <span className="text-sm font-medium text-neutral-700">{label}</span>
            {showRequired && <span className="ml-1 text-sm font-semibold text-danger">*</span>}
          </span>
        )}
        <input
          {...props}
          ref={ref}
          className={`w-full px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 text-base sm:text-sm rounded-lg border focus:ring-2 focus:ring-accent focus:border-transparent transition ${
            error ? "border-danger" : "border-neutral-300"
          } ${className}`}
        />
        {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
      </label>
    );
  }
);

Input.displayName = "Input";

export default Input;
