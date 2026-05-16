"use client";

import Link from "next/link";
import { Pencil, Sparkles } from "lucide-react";

export default function ProfileOwnerToolbar({
  completionScore,
  isAgency,
}: {
  completionScore?: number | null;
  isAgency?: boolean;
}) {
  const editHref = "/profile";
  const wizardHref = "/profile/publico/wizard";
  const completion =
    typeof completionScore === "number" && Number.isFinite(completionScore)
      ? Math.round(Math.max(0, Math.min(100, completionScore)))
      : null;

  return (
    <div className="border-b border-slate-200 bg-amber-50/70">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8">
        <Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />
        <span className="font-medium text-slate-900">
          Você está vendo seu próprio perfil público
          {isAgency ? " (visão da agência)" : ""}.
        </span>
        {completion != null ? (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-amber-200">
            {completion}% completo
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link
            href={wizardHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Melhorar em 6 passos
          </Link>
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar dados
          </Link>
        </div>
      </div>
    </div>
  );
}
