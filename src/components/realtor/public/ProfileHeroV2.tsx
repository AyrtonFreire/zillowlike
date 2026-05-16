"use client";

import Image from "next/image";
import {
  BadgeCheck,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
} from "lucide-react";
import type {
  PriceRangeVM,
  SignatureStatVM,
} from "@/lib/public-profile-viewmodel";
import ProfileSignatureCard from "./ProfileSignatureCard";

interface ProfileHeroV2Props {
  name: string;
  image: string | null;
  roleLabel: string;
  locationLabel: string | null;
  creci: string | null;
  creciState: string | null;
  creciValid: boolean;
  tagline: string | null;
  lastActivityDays: number | null;
  priceRange: PriceRangeVM | null;
  signatureStats: SignatureStatVM[];
  totalRatings: number;
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

function formatActivityLabel(days: number | null): string | null {
  if (days == null) return null;
  if (days === 0) return "Ativo hoje";
  if (days === 1) return "Ativo ontem";
  if (days <= 7) return `Ativo há ${days} dias`;
  if (days <= 30) return `Ativo há ${days} dias`;
  return null;
}

export default function ProfileHeroV2({
  name,
  image,
  roleLabel,
  locationLabel,
  creci,
  creciState,
  creciValid,
  tagline,
  lastActivityDays,
  priceRange,
  signatureStats,
  totalRatings,
  whatsappAction,
  telHref,
  reviewsAction,
  shareAction,
}: ProfileHeroV2Props) {
  const initials = initialsOf(name);
  const creciLabel = creci && creciState ? `CRECI ${creci}/${creciState}` : creci ? `CRECI ${creci}` : null;
  const activityLabel = formatActivityLabel(lastActivityDays);

  return (
    <section className="mx-auto max-w-5xl px-4 pt-10 pb-8 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16 lg:pb-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
        {/* Identidade */}
        <div>
          <div className="flex items-center gap-5">
            <span className="relative inline-flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-1 ring-slate-200 sm:h-28 sm:w-28">
              {image ? (
                <Image
                  src={image}
                  alt={name}
                  width={128}
                  height={128}
                  className="h-full w-full object-cover"
                  priority
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-2xl font-semibold text-slate-700 sm:text-3xl">
                  {initials}
                </span>
              )}
            </span>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{roleLabel}</p>
              <h1 className="mt-1 font-serif text-3xl leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                {name}
              </h1>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            {locationLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {locationLabel}
              </span>
            ) : null}
            {creciLabel ? (
              <span className="inline-flex items-center gap-1.5">
                {creciValid ? (
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                ) : null}
                <span>{creciLabel}</span>
              </span>
            ) : null}
            {activityLabel ? (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {activityLabel}
              </span>
            ) : null}
          </div>

          {tagline ? (
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-700">{tagline}</p>
          ) : null}

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

            {reviewsAction && totalRatings > 0 ? (
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

        {/* SignatureCard (lateral em lg, abaixo em mobile) */}
        <ProfileSignatureCard
          priceRange={priceRange}
          stats={signatureStats}
          totalRatings={totalRatings}
          reviewsAction={reviewsAction}
        />
      </div>
    </section>
  );
}
