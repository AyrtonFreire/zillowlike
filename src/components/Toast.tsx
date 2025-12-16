"use client";

import { useEffect } from "react";

export type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  onClose(): void;
  autoCloseMs?: number;
};

export default function Toast({ message, type = "info", onClose, autoCloseMs = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [onClose, autoCloseMs]);
  const base = type === "error" ? "bg-red-50 border-red-200 text-red-700" : type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-blue-50 border-blue-200 text-blue-700";
  return (
    <div
      role="status"
      className={`fixed top-4 right-4 z-50 border rounded-lg px-4 py-3 shadow ${base}`}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{message}</div>
        <button aria-label="Fechar aviso" onClick={onClose} className="ml-2 text-sm underline">Fechar</button>
      </div>
    </div>
  );
}
