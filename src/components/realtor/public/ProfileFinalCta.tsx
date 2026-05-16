"use client";

import Image from "next/image";
import { MessageCircle, Phone } from "lucide-react";

interface ProfileFinalCtaProps {
  realtorName: string;
  realtorImage: string | null;
  whatsappAction?: () => void;
  telHref?: string | null;
  variant?: "default" | "sparse";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ProfileFinalCta({
  realtorName,
  realtorImage,
  whatsappAction,
  telHref,
  variant = "default",
}: ProfileFinalCtaProps) {
  if (!whatsappAction && !telHref) return null;

  const firstName = realtorName.split(" ")[0] || realtorName;
  const heading =
    variant === "sparse"
      ? `Conte para ${firstName} o que você procura`
      : "Pronto para começar a próxima conversa?";

  return (
    <section className="py-12">
      <div className="rounded-3xl bg-slate-950 px-6 py-10 text-white sm:px-10 sm:py-12">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/30">
              {realtorImage ? (
                <Image
                  src={realtorImage}
                  alt={realtorName}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-white">{initialsOf(realtorName)}</span>
              )}
            </span>
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl">{heading}</h2>
              <p className="mt-1 text-sm text-slate-300">
                Resposta direta com {firstName}, sem intermediação.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {whatsappAction ? (
              <button
                type="button"
                onClick={whatsappAction}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400"
              >
                <MessageCircle className="h-4 w-4" />
                Falar no WhatsApp
              </button>
            ) : null}
            {telHref ? (
              <a
                href={`tel:${telHref}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Phone className="h-4 w-4" />
                Ligar agora
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
