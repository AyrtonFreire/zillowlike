"use client";
import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const base = "inline-flex items-center justify-center rounded-xl font-semibold tracking-[0.01em] transition-all duration-150 ease-default shadow-sm disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99]";
// Touch targets: min 44px height on mobile (min-h-11 = 44px)
const sizes: Record<Size, string> = {
  sm: "text-sm px-3.5 py-2 min-h-[40px] sm:min-h-0 sm:py-2",
  md: "text-sm px-4.5 py-2.5 min-h-[44px] sm:min-h-0 sm:py-2.5",
  lg: "text-base px-5.5 py-3 min-h-[48px] sm:min-h-0 sm:py-3",
};
const variants: Record<Variant, string> = {
  primary: "glass-teal text-white focus-visible:ring-teal-500/40",
  secondary: "border border-gray-300 bg-white text-gray-800 hover:border-gray-400 hover:bg-gray-50 focus-visible:ring-teal-500/20",
  ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-300 shadow-none",
  danger: "bg-danger text-white hover:bg-red-700 focus-visible:ring-danger",
};

export function Button({ variant = "primary", size = "md", leftIcon, rightIcon, loading, className = "", children, ...props }: ButtonProps) {
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      <span className={loading ? "opacity-80" : undefined}>{children}</span>
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
}

export default Button;
