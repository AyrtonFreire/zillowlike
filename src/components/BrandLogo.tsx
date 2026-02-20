"use client";

import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  onClick?: () => void;
  className?: string;
  wordmarkClassName?: string;
  size?: number;
  tone?: "light" | "dark";
};

export default function BrandLogo({
  href = "/",
  onClick,
  className = "",
  wordmarkClassName = "",
  size = 36,
  tone = "dark",
}: BrandLogoProps) {
  const textClass = tone === "light" ? "text-white" : "text-slate-900";
  const markClass = tone === "light" ? "text-white" : "text-brand-teal";

  return (
    <Link
      href={href}
      onClick={() => {
        onClick?.();
      }}
      className={`inline-flex items-center gap-2 ${className}`.trim()}
      aria-label="OggaHub"
    >
      <span
        className={`inline-flex items-center justify-center ${markClass}`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="2.8" opacity="0.9" />
          <path
            d="M12 34c2.2 9.8 11 17 20.6 18.1"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M14.2 26.2c-3 9.6.8 20.2 9.2 25.8"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d="M22.5 33.8 32 25.6l9.5 8.2v12.2c0 1.1-.9 2-2 2H25.5c-1.1 0-2-.9-2-2V33.8Z"
            fill="currentColor"
            opacity="0.95"
          />
          <path
            d="M28.4 47.9v-8.1c0-.8.6-1.4 1.4-1.4h4.4c.8 0 1.4.6 1.4 1.4v8.1"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.95"
          />
          <path
            d="M32 29.2 20.3 39"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M32 29.2 43.7 39"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      </span>

      <span
        className={`leading-none ${textClass} ${wordmarkClassName}`.trim()}
        style={{ fontFamily: "var(--font-logo), var(--font-sans)" }}
      >
        OggaHub
      </span>
    </Link>
  );
}
