"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";

type Tone = "neutral" | "success" | "warning" | "error" | "info";

const badgeToneClasses: Record<Tone, string> = {
  neutral: "border-neutral-200 bg-neutral-50 text-neutral-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

const bannerToneClasses: Record<Tone, string> = {
  neutral: "border-neutral-200 bg-white text-neutral-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

function toneIcon(tone: Tone) {
  if (tone === "success") return <CheckCircle2 className="h-5 w-5" />;
  if (tone === "warning") return <AlertTriangle className="h-5 w-5" />;
  if (tone === "error") return <AlertCircle className="h-5 w-5" />;
  return <Info className="h-5 w-5" />;
}

export function SectionCard({
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</div> : null}
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-950">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </CardHeader>
      <CardBody className="space-y-5">{children}</CardBody>
    </Card>
  );
}

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeToneClasses[tone]}`}>
      {label}
    </span>
  );
}

export function InlineFeedbackBanner({
  title,
  message,
  tone,
  onDismiss,
}: {
  title: string;
  message?: string;
  tone: Tone;
  onDismiss?: () => void;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${bannerToneClasses[tone]}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{toneIcon(tone)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          {message ? <p className="mt-1 text-sm opacity-90">{message}</p> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-current/70 transition hover:bg-black/5 hover:text-current"
            aria-label="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SettingRow({
  title,
  value,
  description,
  status,
  action,
  children,
}: {
  title: string;
  value: string;
  description: string;
  status?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
            {status}
          </div>
          <p className="mt-2 text-sm font-medium text-neutral-800">{value}</p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">{description}</p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
        {action ? <div className="flex shrink-0 items-start">{action}</div> : null}
      </div>
    </div>
  );
}

export function StatTile({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{value}</div>
      {helper ? <div className="mt-1 text-xs text-neutral-500">{helper}</div> : null}
    </div>
  );
}
