import type { NeighborhoodEntry } from "@/lib/public-profile-viewmodel";

export default function ProfileSpecialtiesStrip({
  specialties,
  topNeighborhoods,
}: {
  specialties: string[];
  topNeighborhoods: NeighborhoodEntry[];
}) {
  const hasSpecialties = specialties.length > 0;
  const hasNeighborhoods = topNeighborhoods.length > 0;
  if (!hasSpecialties && !hasNeighborhoods) return null;

  return (
    <section className="border-b border-slate-200 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        {hasSpecialties ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Especialidades
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {specialties.slice(0, 8).map((specialty) => (
                <span
                  key={specialty}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {hasNeighborhoods ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Atua principalmente em
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {topNeighborhoods.slice(0, 6).map((entry) => (
                <span
                  key={entry.name}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
                >
                  <span>{entry.name}</span>
                  <span className="text-xs text-slate-500">{entry.count}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
