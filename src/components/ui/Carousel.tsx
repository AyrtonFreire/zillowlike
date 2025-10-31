"use client";
import * as React from "react";

export default function Carousel({ items, renderItem, className = "", auto = false, interval = 5000 }: { items: any[]; renderItem: (item: any, index: number) => React.ReactNode; className?: string; auto?: boolean; interval?: number; }) {
  const [index, setIndex] = React.useState(0);
  const len = items.length;
  React.useEffect(() => {
    if (!auto || len <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % len), interval);
    return () => clearInterval(id);
  }, [auto, interval, len]);
  if (len === 0) return null;
  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden rounded-xl">
        <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${index * 100}%)` }}>
          {items.map((it, i) => (
            <div key={i} className="min-w-full">
              {renderItem(it, i)}
            </div>
          ))}
        </div>
      </div>
      {len > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
          {items.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} className={`h-2 rounded-full transition-all ${i === index ? 'bg-neutral-900 w-6' : 'bg-neutral-300 w-2 hover:bg-neutral-400'}`} aria-label={`Ir para slide ${i+1}`} />
          ))}
        </div>
      )}
      {len > 1 && (
        <>
          <button onClick={() => setIndex((i) => (i - 1 + len) % len)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow">
            ‹
          </button>
          <button onClick={() => setIndex((i) => (i + 1) % len)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow">
            ›
          </button>
        </>
      )}
    </div>
  );
}
