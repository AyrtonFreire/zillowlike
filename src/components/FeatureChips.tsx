"use client";

import { ReactNode } from "react";

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1.5 text-sm text-gray-700 shadow-sm">
      <span className="opacity-80">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

export default function FeatureChips({
  items,
}: {
  items: Array<{ icon: ReactNode; label: string }>
}) {
  if (!items || items.length === 0) return <span className="text-sm text-gray-600">Sem características informadas.</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, idx) => (
        <Chip key={idx} icon={it.icon}>{it.label}</Chip>
      ))}
    </div>
  );
}
