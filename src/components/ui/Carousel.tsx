"use client";
import * as React from "react";

export default function Carousel({ items, renderItem, className = "", auto = false, interval = 5000 }: { items: any[]; renderItem: (item: any, index: number) => React.ReactNode; className?: string; auto?: boolean; interval?: number; }) {
  const [index, setIndex] = React.useState(0);
  const len = items.length;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(0);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);

  const startX = React.useRef<number | null>(null);
  const startY = React.useRef<number | null>(null);
  const startT = React.useRef<number | null>(null);
  const lastX = React.useRef<number | null>(null);
  const lastT = React.useRef<number | null>(null);
  const lock = React.useRef<null | 'h' | 'v'>(null);

  React.useEffect(() => {
    const update = () => setW(containerRef.current ? containerRef.current.clientWidth : 0);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  React.useEffect(() => {
    if (!auto || len <= 1 || dragging) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % len), interval);
    return () => clearInterval(id);
  }, [auto, interval, len, dragging]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startT.current = performance.now();
    lastX.current = t.clientX;
    lastT.current = startT.current;
    lock.current = null;
    setDragging(true);
    setDragX(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const t = e.touches[0];
    const now = performance.now();
    lastX.current = t.clientX;
    lastT.current = now;

    if (!lock.current) {
      const dx0 = Math.abs(t.clientX - startX.current);
      const dy0 = Math.abs(t.clientY - startY.current!);
      const thr = 8;
      if (dx0 < thr && dy0 < thr) return;
      lock.current = dx0 > dy0 ? 'h' : 'v';
    }
    if (lock.current === 'v') return;

    let dx = t.clientX - (startX.current as number);
    const atFirst = index === 0;
    const atLast = index === len - 1;
    if ((atFirst && dx > 0) || (atLast && dx < 0)) {
      dx = dx * 0.35;
    }
    setDragX(dx);
    e.preventDefault();
  };

  const onTouchEnd = () => {
    if (startX.current != null && lastX.current != null && lock.current !== 'v') {
      const dx = (lastX.current as number) - (startX.current as number);
      const dt = Math.max(1, (lastT.current ?? performance.now()) - (startT.current ?? performance.now()));
      const velocity = dx / dt;
      const vThr = 0.5;
      const dThr = Math.max(50, w * 0.15);
      if (velocity <= -vThr) setIndex((i) => Math.min(len - 1, i + 1));
      else if (velocity >= vThr) setIndex((i) => Math.max(0, i - 1));
      else if (dx <= -dThr) setIndex((i) => Math.min(len - 1, i + 1));
      else if (dx >= dThr) setIndex((i) => Math.max(0, i - 1));
    }
    startX.current = null;
    startY.current = null;
    startT.current = null;
    lastX.current = null;
    lastT.current = null;
    lock.current = null;
    setDragging(false);
    setDragX(0);
  };

  if (len === 0) return null;
  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`flex ${dragging ? 'transition-none' : 'transition-transform duration-500'}`}
          style={{ transform: dragging ? `translateX(${dragX - index * w}px)` : `translateX(-${index * 100}%)` }}
        >
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
          <button onClick={() => setIndex((i) => Math.max(0, i - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow">
            ‹
          </button>
          <button onClick={() => setIndex((i) => Math.min(len - 1, i + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow">
            ›
          </button>
        </>
      )}
    </div>
  );
}
