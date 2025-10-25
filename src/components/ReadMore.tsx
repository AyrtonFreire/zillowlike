"use client";

import { useState } from "react";

export default function ReadMore({ text, maxChars = 280 }: { text: string; maxChars?: number }) {
  const [open, setOpen] = useState(false);
  const tooLong = (text || "").length > maxChars;
  const visible = open || !tooLong ? text : text.slice(0, maxChars) + "…";
  return (
    <div>
      <p className="text-gray-700 leading-relaxed whitespace-pre-line">{visible}</p>
      {tooLong && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
          aria-expanded={open}
          aria-label={open ? "Mostrar menos" : "Ler mais"}
        >
          {open ? "Mostrar menos" : "Ler mais"}
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
      )}
    </div>
  );
}
