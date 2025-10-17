"use client";

import { useRouter } from "next/navigation";

type Chip = {
  id: string;
  label: string;
  qs: Record<string, string>;
};

const CHIPS: Chip[] = [
  { id: "new", label: "Novidades", qs: { sort: "recent" } },
  { id: "price_drop", label: "Preço reduzido", qs: { tag: "price_drop" } },
  { id: "pet", label: "Pet friendly", qs: { tag: "pet_friendly" } },
  { id: "garage", label: "Com garagem", qs: { tag: "garage" } },
  { id: "ready", label: "Prontos para morar", qs: { tag: "ready_to_move" } },
];

export default function QuickCategories({ active }: { active?: URLSearchParams }) {
  const router = useRouter();

  function apply(qs: Record<string, string>) {
    const sp = active ? new URLSearchParams(active) : new URLSearchParams();
    for (const [k, v] of Object.entries(qs)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const url = sp.toString() ? `/?${sp.toString()}` : "/";
    router.push(url);
  }

  const activeTag = active?.get("tag") || null;

  return (
    <div className="mx-auto max-w-7xl px-4 mt-6">
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => {
          const isActive = !!activeTag && c.qs.tag === activeTag;
          const base = "px-4 py-2 rounded-full text-sm font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98]";
          const cls = isActive
            ? "bg-blue-600 text-white shadow-md hover:shadow-lg border border-transparent"
            : "bg-white text-gray-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-md border border-gray-200 hover:border-gray-300";
          return (
            <button
              key={c.id}
              onClick={() => apply(c.qs)}
              className={`${base} ${cls}`}
              aria-pressed={activeTag ? c.qs.tag === activeTag : undefined}
              role="button"
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
