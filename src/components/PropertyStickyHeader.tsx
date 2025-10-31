"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import FavoriteButton from "./FavoriteButton";

export default function PropertyStickyHeader({
  title,
  priceCents,
  image,
  scheduleHref,
  propertyId,
  pageUrl,
}: {
  title: string;
  priceCents: number;
  image?: string | null;
  scheduleHref: string;
  propertyId: string;
  pageUrl: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 480);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const price = (priceCents / 100).toLocaleString("pt-BR");

  return (
    <div className={`fixed top-0 inset-x-0 z-40 transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-20'}`}>
      <div className="bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {image && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <Image src={image} alt={title} fill className="object-cover" sizes="48px" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
              <div className="text-xs text-blue-700 font-bold">R$ {price}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link prefetch={false} href={scheduleHref} className="hidden sm:inline-flex px-3 py-2 rounded-lg bg-gradient-to-r glass-teal text-white text-sm font-semibold shadow">
              Agendar
            </Link>
            <button
              aria-label="Compartilhar"
              onClick={async () => { try { if (navigator.share) await navigator.share({ title, url: pageUrl }); else await navigator.clipboard.writeText(pageUrl); } catch {} }}
              className="px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"
            >
              Compartilhar
            </button>
            <FavoriteButton propertyId={propertyId} />
          </div>
        </div>
      </div>
    </div>
  );
}
