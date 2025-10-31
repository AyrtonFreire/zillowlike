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

const base = "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 ease-default disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
const sizes: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-600 focus-visible:ring-accent",
  secondary: "bg-neutral-900 text-white hover:bg-neutral-700 focus-visible:ring-neutral-900",
  ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-300",
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
