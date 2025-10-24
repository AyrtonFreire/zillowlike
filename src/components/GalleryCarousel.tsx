"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Img = { url: string; alt?: string; blurDataURL?: string };
export default function GalleryCarousel({ images, title }: { images: Img[]; title: string }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const hasImages = images && images.length > 0;
  const current = images?.[index] || null;

  // Scroll to index
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const child = node.children[index] as HTMLElement | undefined;
    if (child) child.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [index]);

  // Keyboard nav in fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, images.length]);

  const sizes = useMemo(() => "(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px", []);

  if (!hasImages) return null;

  return (
    <div className="relative">
      {/* Viewport */}
      <div ref={viewportRef} className="relative w-full h-[320px] md:h-[440px] overflow-hidden flex snap-x snap-mandatory scroll-pl-0 gap-0">
        {images.map((img, i) => (
          <div key={i} className="relative w-full h-full flex-shrink-0 snap-start">
            <Image
              src={img.url}
              alt={img.alt || title}
              fill
              sizes={sizes}
              priority={i === 0}
              placeholder="blur"
              blurDataURL={img.blurDataURL || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIGZpbGw9JyNlZWVmZmYnIC8+PC9zdmc+"}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      <button aria-label="Imagem anterior" className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
      </button>
      <button aria-label="Próxima imagem" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow" onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
      </button>

      {/* Overlay actions */}
      <div className="absolute top-3 right-3 flex gap-2">
        <button aria-label="Abrir em tela cheia" title="Tela cheia" onClick={() => setFullscreen(true)} className="p-2 rounded-full bg-white/90 hover:bg-white shadow">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3H5a2 2 0 00-2 2v3m0 6v3a2 2 0 002 2h3m6-16h3a2 2 0 012 2v3m0 6v3a2 2 0 01-2 2h-3"/></svg>
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 mx-3 hidden md:block">
          <div className="flex gap-2 overflow-x-auto px-2 py-2 rounded-lg bg-black/20 backdrop-blur">
            {images.slice(0, 10).map((im, i) => (
              <button aria-label={`Ir para imagem ${i+1}`} key={i} onClick={() => setIndex(i)} className={`relative h-16 w-28 rounded-md overflow-hidden ring-2 ${index===i? 'ring-white' : 'ring-white/50'}`}>
                <Image src={im.url} alt={(im.alt || title)+" thumb"} width={160} height={90} className="h-full w-full object-cover" loading="lazy" placeholder="blur" blurDataURL={im.blurDataURL || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTYwJyBoZWlnaHQ9JzkwJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IHdpZHRoPScxNjAnIGhlaWdodD0nOTAnIGZpbGw9JyNlZWVmZmYnIC8+PC9zdmc+"} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen viewer */}
      {fullscreen && (
        <div className="fixed inset-0 z-50">
          <button aria-label="Fechar" className="absolute inset-0 bg-black/80" onClick={() => setFullscreen(false)} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-[92vw] h-[82vh]">
              {current && (
                <Image src={current.url} alt={current.alt || title} fill sizes="100vw" className="object-contain" priority />
              )}
              <button aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 hover:bg-white shadow" onClick={(e)=>{e.stopPropagation(); setIndex((i) => Math.max(0, i - 1));}}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              </button>
              <button aria-label="Próxima" className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 hover:bg-white shadow" onClick={(e)=>{e.stopPropagation(); setIndex((i) => Math.min(images.length - 1, i + 1));}}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
