import type { RatingDistribution } from "@/lib/public-profile-viewmodel";

export default function ProfileReviewsDistribution({
  distribution,
}: {
  distribution: RatingDistribution;
}) {
  const total =
    distribution[5] + distribution[4] + distribution[3] + distribution[2] + distribution[1];
  if (total === 0) return null;

  const rows: Array<{ key: 1 | 2 | 3 | 4 | 5 }> = [
    { key: 5 },
    { key: 4 },
    { key: 3 },
    { key: 2 },
    { key: 1 },
  ];

  return (
    <div className="space-y-2">
      {rows.map(({ key }) => {
        const count = distribution[key];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-3 text-xs text-slate-600">
            <span className="w-3 text-right tabular-nums">{key}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-amber-400"
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="w-10 text-right tabular-nums text-slate-500">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
