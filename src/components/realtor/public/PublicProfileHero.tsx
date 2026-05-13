"use client";

import Image from "next/image";
import { MessageCircle, Phone, Share2, Star } from "lucide-react";
import { getRealtorAccent } from "@/lib/realtor-accent";

type Stat = {
  label: string;
  value: string;
};

interface PublicProfileHeroProps {
  slug: string | null | undefined;
  name: string;
  image: string | null;
  roleLabel: string;
  locationLabel: string | null;
  creciLabel: string | null;
  bio: string | null;
  stats: Stat[];
  whatsappAction?: () => void;
  telHref?: string | null;
  reviewsAction?: () => void;
  shareAction: () => void;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function PublicProfileHero({
  slug,
  name,
  image,
  roleLabel,
  locationLabel,
  creciLabel,
  bio,
  stats,
  whatsappAction,
  telHref,
  reviewsAction,
  shareAction,
}: PublicProfileHeroProps) {
  const accent = getRealtorAccent(slug);
  const initials = initialsOf(name);

  const subtitleParts = [
    roleLabel && locationLabel ? `${roleLabel} em ${locationLabel}` : roleLabel || locationLabel,
    creciLabel,
  ].filter(Boolean);
  const subtitle = subtitleParts.join(" · ");

  return (
    <section className="relative">
      {/* Banner */}
      <div className={`h-48 w-full ${accent.bannerClass} sm:h-64`} aria-hidden="true">
        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.45),_transparent_55%)]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Avatar sobreposto */}
        <div className="-mt-14 flex items-end gap-4 sm:-mt-16">
          <span
            className={`inline-flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg ring-4 ring-white sm:h-32 sm:w-32 ${accent.ringClass}`}
          >
            {image ? (
              <Image src={image} alt={name} width={128} height={128} className="h-full w-full object-cover" priority />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-3xl font-bold text-slate-700">
                {initials}
              </span>
            )}
          </span>
        </div>

        {/* Identidade */}
        <div className="mt-5">
          <h1 className="font-serif text-3xl leading-tight tracking-tight text-slate-950 sm:text-5xl">{name}</h1>
          {subtitle ? <p className="mt-2 text-sm text-slate-600 sm:text-base">{subtitle}</p> : null}

          {stats.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              {stats.map((stat, idx) => (
                <span key={stat.label} className="inline-flex items-center gap-1.5">
                  {idx === 0 && stat.label.toLowerCase().includes("avalia") ? (
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ) : null}
                  <span className="font-medium text-slate-700">{stat.value}</span>
                  <span className="text-slate-400">{stat.label}</span>
                  {idx < stats.length - 1 ? <span className="text-slate-300">·</span> : null}
                </span>
              ))}
            </div>
          ) : null}

          {bio ? (
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-700">{bio}</p>
          ) : null}
        </div>

        {/* CTAs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
          {whatsappAction ? (
            <button
              type="button"
              onClick={whatsappAction}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </button>
          ) : null}

          <button
            type="button"
            onClick={shareAction}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            <Share2 className="h-4 w-4" />
            Compartilhar
          </button>

          {telHref ? (
            <a
              href={`tel:${telHref}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-slate-900 hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              Ligar
            </a>
          ) : null}

          {reviewsAction ? (
            <button
              type="button"
              onClick={reviewsAction}
              className="text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-slate-900 hover:underline"
            >
              Ver avaliações
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
