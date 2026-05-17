"use client";

import { useEffect, useRef, useState } from "react";

export type StickyNavItem =
  | { kind: "link"; id: string; label: string }
  | { kind: "action"; label: string; onClick: () => void };

export default function ProfileStickyNav({
  items,
  topOffset = 64,
}: {
  items: StickyNavItem[];
  topOffset?: number;
}) {
  const [active, setActive] = useState<string | null>(null);
  const linkIds = useRef<string[]>([]);

  useEffect(() => {
    linkIds.current = items.filter((i) => i.kind === "link").map((i) => (i as { id: string }).id);
    if (typeof window === "undefined") return;

    const observed: Element[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: `-${topOffset + 24}px 0px -55% 0px`, threshold: [0.1, 0.5] }
    );

    for (const id of linkIds.current) {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    }

    return () => {
      for (const el of observed) observer.unobserve(el);
      observer.disconnect();
    };
  }, [items, topOffset]);

  if (items.length === 0) return null;

  return (
    <div
      className="sticky z-20 mb-4 border-b border-slate-200 bg-white/85 backdrop-blur-md"
      style={{ top: topOffset }}
    >
      <nav className="mx-auto flex max-w-6xl items-center gap-x-6 gap-y-3 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm text-slate-600 sm:px-6 lg:px-8 xl:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => {
          if (item.kind === "link") {
            const isActive = active === item.id;
            return (
              <a
                key={`${item.kind}-${item.id}-${index}`}
                href={`#${item.id}`}
                className={`transition ${isActive ? "font-semibold text-slate-950" : "hover:text-slate-950"}`}
              >
                {item.label}
              </a>
            );
          }
          return (
            <button
              key={`${item.kind}-${item.label}-${index}`}
              type="button"
              onClick={item.onClick}
              className="transition hover:text-slate-950"
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
