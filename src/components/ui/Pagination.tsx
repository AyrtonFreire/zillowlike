"use client";
import * as React from "react";
import Button from "./Button";

export default function Pagination({ total, page, pageSize, onChange }: { total: number; page: number; pageSize: number; onChange: (page: number) => void; }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const makePages = () => {
    const pages: number[] = [];
    const max = totalPages;
    const start = Math.max(1, page - 2);
    const end = Math.min(max, page + 2);
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2 mt-6 select-none" aria-label="Paginação">
      <Button size="sm" variant="ghost" disabled={!canPrev} onClick={() => onChange(page - 1)}>Anterior</Button>
      {makePages().map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${p === page ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100'}`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <Button size="sm" variant="ghost" disabled={!canNext} onClick={() => onChange(page + 1)}>Próxima</Button>
    </nav>
  );
}
