"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Facebook, Instagram, Link as LinkIcon, MessageCircle, QrCode, X } from "lucide-react";

interface PublicProfileSharePanelProps {
  open: boolean;
  onClose: () => void;
  pageUrl: string;
  realtorName: string;
  realtorWhatsappDigits: string | null;
}

function buildWaUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function buildFbUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

function buildQrSrc(url: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
}

export default function PublicProfileSharePanel({
  open,
  onClose,
  pageUrl,
  realtorName,
  realtorWhatsappDigits,
}: PublicProfileSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setShowQr(false);
      return;
    }
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", escHandler);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", escHandler);
    };
  }, [open, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!open) return null;

  const inviteMessage = `Conheça o perfil de ${realtorName}: ${pageUrl}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Compartilhar perfil"
        className="w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-950">Compartilhar perfil</h3>
            <p className="mt-0.5 text-xs text-slate-500">Indique {realtorName} para alguém.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {showQr ? (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={buildQrSrc(pageUrl)} alt="QR Code do perfil" className="h-60 w-60" />
              </div>
              <p className="text-center text-xs text-slate-500">Aponte a câmera para abrir este perfil.</p>
              <button
                type="button"
                onClick={() => setShowQr(false)}
                className="text-sm font-semibold text-slate-700 hover:text-slate-950"
              >
                Voltar
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={buildWaUrl(inviteMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  WhatsApp
                </a>
                <a
                  href={buildFbUrl(pageUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Facebook className="h-4 w-4" />
                  </span>
                  Facebook
                </a>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      await navigator.clipboard.writeText(pageUrl);
                    } catch {
                      // ignore
                    }
                    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
                  }}
                  className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition hover:border-pink-300 hover:bg-pink-50"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 via-pink-500 to-purple-600 text-white">
                    <Instagram className="h-4 w-4" />
                  </span>
                  Instagram
                </a>
                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <QrCode className="h-4 w-4" />
                  </span>
                  QR code
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{pageUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      copied ? "bg-emerald-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>

              {realtorWhatsappDigits ? (
                <p className="mt-3 text-center text-[11px] text-slate-400">
                  Compartilhe este perfil com clientes para acelerar conversas.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
