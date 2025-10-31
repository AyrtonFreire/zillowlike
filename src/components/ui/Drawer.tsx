"use client";
import * as React from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: "left" | "right" | "bottom";
}

export default function Drawer({ open, onClose, title, children, side = "right" }: DrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<Element | null>(null);

  React.useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Focus first focusable element inside panel
    setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length) focusables[0].focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previouslyFocused.current instanceof HTMLElement) {
        (previouslyFocused.current as HTMLElement).focus();
      }
    };
  }, [open, onClose]);

  const onTabTrap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled'));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div aria-hidden={!open} className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div onClick={onClose} className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      {/* Panel */}
      <div
        ref={panelRef}
        onKeyDown={onTabTrap}
        className={`absolute bg-white shadow-2xl h-full w-full sm:w-[420px] ${side === 'right' ? 'right-0' : side === 'left' ? 'left-0' : 'bottom-0 h-[80%] w-full'} transition-transform ${open ? 'translate-x-0 translate-y-0' : side === 'right' ? 'translate-x-full' : side === 'left' ? '-translate-x-full' : 'translate-y-full'}`}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b">
          <div className="text-sm font-semibold text-neutral-900">{title}</div>
          <button onClick={onClose} className="text-neutral-600 hover:text-neutral-900 text-sm">Fechar</button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
          {children}
        </div>
      </div>
    </div>
  );
}
