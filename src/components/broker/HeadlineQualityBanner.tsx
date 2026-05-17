"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import {
  validateBio,
  validateHeadline,
} from "@/app/profile/publico/wizard/validators";

const DISMISS_KEY = "ogga_headline_banner_dismissed_v1";

type Severity = "headline" | "bio" | null;

export default function HeadlineQualityBanner() {
  const [severity, setSeverity] = useState<Severity>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      // ignore
    }

    let cancelled = false;
    fetch("/api/user/profile", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.user) return;
        const user = data.user as {
          role?: string;
          publicHeadline?: string | null;
          publicBio?: string | null;
        };
        if (user.role !== "REALTOR" && user.role !== "AGENCY") return;
        const headline = String(user.publicHeadline || "").trim();
        const bio = String(user.publicBio || "").trim();
        if (headline) {
          const result = validateHeadline(headline);
          if (result.level === "block") {
            setSeverity("headline");
            return;
          }
        }
        if (bio) {
          const result = validateBio(bio);
          if (result.level === "block") {
            setSeverity("bio");
          }
        }
      })
      .catch(() => {
        // best-effort
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (dismissed || severity === null) return null;

  const headingMap: Record<NonNullable<Severity>, string> = {
    headline: "Sua headline parece genérica",
    bio: "Sua bio precisa de mais conteúdo",
  };
  const helperMap: Record<NonNullable<Severity>, string> = {
    headline:
      "Frases como “Especialista em tudo” afastam clientes — leva 6 passos rápidos pra trocar por algo que destaque seu nicho.",
    bio: "Bio com menos de 80 caracteres não conta sua história — leva poucos minutos pra deixar mais consistente.",
  };

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{headingMap[severity]}</p>
          <p className="mt-1 text-xs text-slate-700">{helperMap[severity]}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link
              href="/profile/publico/wizard"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Melhorar em 6 passos
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-medium text-slate-600 underline-offset-4 transition hover:text-slate-900 hover:underline"
            >
              Lembrar mais tarde
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dispensar"
          className="rounded-full p-1 text-slate-500 transition hover:bg-amber-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
