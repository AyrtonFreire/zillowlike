"use client";

import { MessageCircle } from "lucide-react";

const DEFAULT_GREETING =
  "Olá! Vim do site OggaHub e gostaria de ajuda para usar a plataforma.";

export default function SupportFloatingButton() {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;
  if (!phone) return null;

  const clean = phone.replace(/\D/g, "");
  if (!clean) return null;

  const url = `https://wa.me/${clean}?text=${encodeURIComponent(DEFAULT_GREETING)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o suporte no WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)] transition hover:bg-emerald-400 hover:shadow-[0_14px_40px_-12px_rgba(16,185,129,0.7)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="sr-only">Falar com o suporte no WhatsApp</span>
    </a>
  );
}
