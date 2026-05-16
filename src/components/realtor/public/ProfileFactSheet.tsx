import { ArrowUpRight, BadgeCheck } from "lucide-react";

export type FactSheetItem = {
  label: string;
  value: string | null;
  href?: string | null;
  verified?: boolean;
};

export type FactSheetVM = {
  items: FactSheetItem[];
  specialties: string[];
  serviceAreas: string[];
};

function compactUrl(href: string): string {
  return href.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

export default function ProfileFactSheet({
  factSheet,
}: {
  factSheet: FactSheetVM;
}) {
  const hasItems = factSheet.items.some((item) => item.value);
  const hasSpecialties = factSheet.specialties.length > 0;
  const hasAreas = factSheet.serviceAreas.length > 0;
  if (!hasItems && !hasSpecialties && !hasAreas) return null;

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Ficha profissional
      </p>

      {hasItems ? (
        <dl className="mt-4 space-y-4 text-sm">
          {factSheet.items
            .filter((item) => item.value)
            .map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-slate-900">
                  {item.verified ? (
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  ) : null}
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline-offset-4 transition hover:underline"
                    >
                      {compactUrl(item.href)}
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : (
                    <span>{item.value}</span>
                  )}
                </dd>
              </div>
            ))}
        </dl>
      ) : null}

      {hasSpecialties ? (
        <div className={hasItems ? "mt-5 border-t border-slate-100 pt-5" : "mt-4"}>
          <p className="text-xs font-medium text-slate-500">Especialidades</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {factSheet.specialties.slice(0, 8).map((specialty) => (
              <span
                key={specialty}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {hasAreas ? (
        <div className={hasItems || hasSpecialties ? "mt-5 border-t border-slate-100 pt-5" : "mt-4"}>
          <p className="text-xs font-medium text-slate-500">Áreas atendidas</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {factSheet.serviceAreas.slice(0, 10).map((area) => (
              <span
                key={area}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
