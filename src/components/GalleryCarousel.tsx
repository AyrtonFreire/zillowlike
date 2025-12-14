"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type Img = { url: string; alt?: string; blurDataURL?: string };
export default function GalleryCarousel({ images, title }: { images: Img[]; title: string }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  // Fullscreen swipe state - IGUAL AO CARD
  const fsContainerRef = useRef<HTMLDivElement>(null);
  const [fsContainerW, setFsContainerW] = useState(0);
  const [fsIsDragging, setFsIsDragging] = useState(false);
  const [fsDragX, setFsDragX] = useState(0);
  const fsStartX = useRef<number | null>(null);
  const fsStartY = useRef<number | null>(null);
  const fsStartT = useRef<number | null>(null);
  const fsLastX = useRef<number | null>(null);
  const fsLastT = useRef<number | null>(null);
  const fsLock = useRef<null | "h" | "v">(null);

  const transformCloudinary = (url: string, transformation: string) => {
    try {
      const marker = "/image/upload/";
      const idx = url.indexOf(marker);
      if (idx === -1) return url;
      const head = url.substring(0, idx + marker.length);
      const tail = url.substring(idx + marker.length);
      if (tail.startsWith("f_")) return url;
      return `${head}${transformation}/${tail}`;
    } catch {
      return url;
    }
  };

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

  const handleScroll = () => {
    const node = viewportRef.current;
    if (!node) return;
    const width = node.clientWidth || 1;
    const rawIndex = Math.round(node.scrollLeft / width);
    const maxIndex = Math.max(0, images.length - 1);
    const nextIndex = Math.min(maxIndex, Math.max(0, rawIndex));
    setIndex((prev) => (prev === nextIndex ? prev : nextIndex));
  };

  if (!hasImages) return null;

  return (
    <div className="relative">
      {/* Viewport */}
      <div ref={viewportRef} onScroll={handleScroll} className="relative w-full h-[320px] md:h-[440px] overflow-x-auto flex snap-x snap-mandatory scroll-pl-0 gap-0 scrollbar-hide">
        {images.map((img, i) => (
          <div key={i} className="relative w-full h-full flex-shrink-0 snap-start">
            <img
              src={transformCloudinary(img.url, "f_auto,q_auto:good,dpr_auto,w_1600,h_1200,c_fit,g_auto")}
              alt={img.alt || title}
              loading={i === 0 ? "eager" : "lazy"}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="absolute left-3 top-3 px-2 py-1 rounded-full bg-black/60 text-xs text-white font-medium">
          {index + 1} / {images.length}
        </div>
      )}

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

      {/* Thumbnails - Horizontal scroll em mobile */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 mx-3">
          <div className="flex gap-2 overflow-x-auto px-2 py-2 rounded-lg bg-black/20 backdrop-blur scrollbar-hide">
            {images.slice(0, 10).map((im, i) => (
              <button 
                aria-label={`Ir para imagem ${i+1}`} 
                key={i} 
                onClick={() => setIndex(i)} 
                className={`relative h-12 w-16 md:h-16 md:w-28 rounded-md overflow-hidden ring-2 flex-shrink-0 ${index===i? 'ring-white' : 'ring-white/50'}`}
              >
                <img 
                  src={transformCloudinary(im.url, "f_auto,q_auto:eco,dpr_auto,w_320,h_180,c_fill,g_auto")} 
                  alt={(im.alt || title)+" thumb"} 
                  className="w-full h-full object-cover" 
                  loading="lazy" 
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen viewer - swipeable IGUAL AO CARD */}
      {fullscreen && (
        <div className="fixed inset-0 z-50">
          <button aria-label="Fechar" className="absolute inset-0 bg-black/80" onClick={() => setFullscreen(false)} />
          <button
            aria-label="Fechar"
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/70 text-white hover:bg-black/80"
            onClick={() => setFullscreen(false)}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              ref={fsContainerRef}
              className="relative w-[92vw] h-[82vh] overflow-hidden"
              style={{ touchAction: 'pan-y' }}
              onTouchStart={(e) => {
                if (e.touches.length !== 1) return;
                setFsContainerW(fsContainerRef.current?.clientWidth || window.innerWidth * 0.92);
                const t = e.touches[0];
                const now = performance.now();
                fsStartX.current = t.clientX;
                fsStartY.current = t.clientY;
                fsStartT.current = now;
                fsLastX.current = t.clientX;
                fsLastT.current = now;
                fsLock.current = null;
                setFsIsDragging(true);
                setFsDragX(0);
              }}
              onTouchMove={(e) => {
                if (e.touches.length !== 1 || fsStartX.current == null || fsStartY.current == null) return;
                const t = e.touches[0];
                const cx = t.clientX;
                const cy = t.clientY;
                const now = performance.now();
                fsLastX.current = cx;
                fsLastT.current = now;

                const dxTotal = cx - fsStartX.current;
                const dyTotal = cy - fsStartY.current;

                if (!fsLock.current) {
                  const dx0 = Math.abs(dxTotal);
                  const dy0 = Math.abs(dyTotal);
                  const thr = 8;
                  if (dx0 < thr && dy0 < thr) return;
                  fsLock.current = dx0 > dy0 ? "h" : "v";
                }

                if (fsLock.current === "v") return;

                // Rubber-band nas bordas
                let dx = dxTotal;
                const atFirst = index === 0;
                const atLast = index === images.length - 1;
                if ((atFirst && dx > 0) || (atLast && dx < 0)) {
                  dx = dx * 0.35;
                }
                setFsDragX(dx);
                e.preventDefault();
              }}
              onTouchEnd={() => {
                const sx = fsStartX.current;
                const lx = fsLastX.current;
                const st = fsStartT.current;
                const lt = fsLastT.current;
                const lock = fsLock.current;

                if (sx != null && lx != null && lock === "h" && images.length > 1) {
                  const dx = lx - sx;
                  const dt = Math.max(1, (lt ?? performance.now()) - (st ?? performance.now()));
                  const velocity = dx / dt;
                  const dThr = Math.max(50, fsContainerW * 0.15);
                  const vThr = 0.5;

                  if (velocity <= -vThr || dx <= -dThr) {
                    setIndex((i) => Math.min(images.length - 1, i + 1));
                  } else if (velocity >= vThr || dx >= dThr) {
                    setIndex((i) => Math.max(0, i - 1));
                  }
                }

                fsStartX.current = null;
                fsStartY.current = null;
                fsStartT.current = null;
                fsLastX.current = null;
                fsLastT.current = null;
                fsLock.current = null;
                setFsIsDragging(false);
                setFsDragX(0);
              }}
            >
              {/* Todas as imagens lado a lado - segue o dedo */}
              <motion.div
                animate={{ x: fsIsDragging ? -index * fsContainerW + fsDragX : -index * fsContainerW }}
                transition={fsIsDragging ? { type: 'tween', duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                className="flex h-full items-center"
                style={{ width: `${images.length * 100}%` }}
              >
                {images.map((img, i) => (
                  <div key={i} className="relative h-full flex items-center justify-center" style={{ width: `${100 / images.length}%` }}>
                    <img
                      src={img.url}
                      alt={img.alt || title}
                      className="max-w-full max-h-full object-contain"
                      loading={i === index ? "eager" : "lazy"}
                    />
                  </div>
                ))}
              </motion.div>

              {/* Setas de navegação */}
              <button aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 hover:bg-white shadow z-10" onClick={(e)=>{e.stopPropagation(); setIndex((i) => Math.max(0, i - 1));}}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              </button>
              <button aria-label="Próxima" className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 hover:bg-white shadow z-10" onClick={(e)=>{e.stopPropagation(); setIndex((i) => Math.min(images.length - 1, i + 1));}}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </button>
              <div className="absolute bottom-4 inset-x-0 flex justify-center z-10">
                <span className="px-3 py-1 rounded-full bg-black/60 text-xs text-white font-medium">
                  {index + 1} / {images.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
