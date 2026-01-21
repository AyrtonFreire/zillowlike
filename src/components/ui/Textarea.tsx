"use client";
import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  optional?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, optional, className = "", ...props }, ref) => {
    return (
      <label className="block">
        {label && (
          <span className="block mb-1">
            <span className="text-sm font-medium text-neutral-700">{label}</span>
            {optional && <span className="ml-2 text-xs font-normal text-neutral-400">Opcional</span>}
          </span>
        )}
        <textarea
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

Textarea.displayName = "Textarea";

export default Textarea;
