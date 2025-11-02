"use client";
import * as React from "react";

export interface TabItem { key: string; label: string; content: React.ReactNode }

export default function Tabs({ items, defaultKey, onChange, className = "" }: { items: TabItem[]; defaultKey?: string; onChange?: (key: string) => void; className?: string; }) {
  const [active, setActive] = React.useState(defaultKey || (items[0]?.key ?? ""));
  const activeItem = items.find(i => i.key === active) || items[0];
  return (
    <div className={className}>
      <div
        className="flex gap-2 border-b overflow-x-auto whitespace-nowrap md:whitespace-normal md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0"
        role="tablist"
        aria-orientation="horizontal"
      >
        {items.map(it => {
          const selected = active === it.key;
          const tabId = `tab-${it.key}`;
          const panelId = `tabpanel-${it.key}`;
          return (
            <button
              key={it.key}
              id={tabId}
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              onClick={() => { setActive(it.key); onChange?.(it.key); }}
              className={`shrink-0 px-3 py-2 text-sm font-medium border-b-2 -mb-px ${selected ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-600 hover:text-neutral-900'}`}
            >
              {it.label}
            </button>
          );
        })}
      </div>
      <div
        className="pt-3"
        role="tabpanel"
        id={`tabpanel-${activeItem?.key}`}
        aria-labelledby={`tab-${activeItem?.key}`}
      >
        {activeItem?.content}
      </div>
    </div>
  );
}
