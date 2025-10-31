"use client";
import * as React from "react";

export interface AccordionItem { key: string; title: React.ReactNode; content: React.ReactNode }

export default function Accordion({ items, defaultOpen = [] as string[], className = "" }: { items: AccordionItem[]; defaultOpen?: string[]; className?: string; }) {
  const [open, setOpen] = React.useState<Set<string>>(new Set(defaultOpen));
  const toggle = (k: string) => {
    const next = new Set(open);
    if (next.has(k)) next.delete(k); else next.add(k);
    setOpen(next);
  };
  return (
    <div className={`divide-y rounded-xl border border-neutral-200 bg-white ${className}`}>
      {items.map(it => (
        <div key={it.key}>
          <button onClick={() => toggle(it.key)} className="w-full px-4 py-3 flex items-center justify-between text-left">
            <span className="text-sm font-semibold text-neutral-900">{it.title}</span>
            <span className={`text-neutral-500 transition-transform ${open.has(it.key) ? 'rotate-180' : ''}`}>⌄</span>
          </button>
          {open.has(it.key) && (
            <div className="px-4 pb-4 text-sm text-neutral-800">{it.content}</div>
          )}
        </div>
      ))}
    </div>
  );
}
