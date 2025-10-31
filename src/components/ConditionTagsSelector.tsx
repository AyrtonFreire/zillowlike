"use client";

import { useState } from "react";

const CONDITION_OPTIONS = [
  "Mobiliado",
  "Semi-mobiliado",
  "Novo",
  "Em construção",
  "Condomínio fechado",
] as const;

interface ConditionTagsSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
}

export default function ConditionTagsSelector({
  value = [],
  onChange,
  maxTags = 5,
}: ConditionTagsSelectorProps) {
  const handleToggle = (tag: string) => {
    if (value.includes(tag)) {
      // Remove tag
      onChange(value.filter((t) => t !== tag));
    } else {
      // Add tag (if not at max)
      if (value.length < maxTags) {
        onChange([...value, tag]);
      }
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-900">
        Condições do Imóvel
        <span className="text-gray-500 font-normal ml-2">
          (Selecione até {maxTags})
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        {CONDITION_OPTIONS.map((tag) => {
          const isSelected = value.includes(tag);
          const isDisabled = !isSelected && value.length >= maxTags;

          return (
            <button
              key={tag}
              type="button"
              onClick={() => handleToggle(tag)}
              disabled={isDisabled}
              className={`
                px-4 py-2 rounded-full text-sm font-semibold transition-all
                ${
                  isSelected
                    ? "bg-teal text-white shadow-md"
                    : isDisabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border-2 border-gray-300 text-gray-700 hover:border-teal-dark hover:bg-teal-50"
                }
              `}
            >
              {isSelected && (
                <span className="mr-1.5">✓</span>
              )}
              {tag}
            </button>
          );
        })}
      </div>

      {value.length > 0 && (
        <div className="mt-3 p-3 bg-teal/5 rounded-lg border border-teal/20">
          <p className="text-sm font-medium text-teal-dark mb-2">
            Tags selecionadas ({value.length}/{maxTags}):
          </p>
          <div className="flex flex-wrap gap-2">
            {value.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal text-white rounded-full text-xs font-semibold"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleToggle(tag)}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
