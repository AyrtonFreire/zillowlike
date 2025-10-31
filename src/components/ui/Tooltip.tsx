"use client";
import * as React from "react";

export default function Tooltip({ content, children, className = "" }: { content: React.ReactNode; children: React.ReactNode; className?: string; }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className={`relative inline-block ${className}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      <span className={`pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-md bg-black/80 text-white text-xs px-2 py-1 shadow transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}>{content}</span>
    </span>
  );
}
