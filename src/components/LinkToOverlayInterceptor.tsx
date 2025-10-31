"use client";

import { useEffect } from "react";

export default function LinkToOverlayInterceptor() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      let el = e.target as HTMLElement | null;
      while (el && el.tagName !== 'A') el = el.parentElement;
      if (!el || el.tagName !== 'A') return;
      const a = el as HTMLAnchorElement;
      try {
        const url = new URL(a.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        const m = url.pathname.match(/^\/property\/(.+)$/);
        if (!m) return;
        const id = m[1];
        if (!id) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-overlay', { detail: { id } }));
      } catch {}
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}
