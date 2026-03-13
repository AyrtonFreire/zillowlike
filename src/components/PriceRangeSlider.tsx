"use client";

import React, { useEffect, useState } from "react";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  /** Valores atuais em reais (inteiros). null significa sem limite naquele lado */
  minValue: number | null | undefined;
  maxValue: number | null | undefined;
  onPreviewChange?: (values: { min: number | null; max: number | null }) => void;
  onChange: (values: { min: number | null; max: number | null }) => void;
}

export default function PriceRangeSlider({
  min,
  max,
  step = 50000,
  minValue,
  maxValue,
  onPreviewChange,
  onChange,
}: PriceRangeSliderProps) {
  const [internalMin, setInternalMin] = useState<number>(minValue ?? min);
  const [internalMax, setInternalMax] = useState<number>(maxValue ?? max);

  const clamp = (value: number) => {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
  };

  useEffect(() => {
    const nextMinRaw = minValue ?? min;
    const nextMaxRaw = maxValue ?? max;

    let nextMin = clamp(nextMinRaw);
    let nextMax = clamp(nextMaxRaw);

    if (nextMin > nextMax) {
      const mid = (nextMin + nextMax) / 2;
      nextMin = clamp(Math.floor(mid));
      nextMax = clamp(Math.ceil(mid));
    }

    setInternalMin(nextMin);
    setInternalMax(nextMax);
  }, [minValue, maxValue, min, max]);

  const preview = (nextMin: number, nextMax: number) => {
    onPreviewChange?.({
      min: nextMin <= min ? null : nextMin,
      max: nextMax >= max ? null : nextMax,
    });
  };

  const commit = (nextMin: number, nextMax: number) => {
    onChange({
      min: nextMin <= min ? null : nextMin,
      max: nextMax >= max ? null : nextMax,
    });
  };

  const handleMinChange = (value: number) => {
    const clamped = clamp(Math.min(value, internalMax));
    setInternalMin(clamped);
    preview(clamped, internalMax);
  };

  const handleMaxChange = (value: number) => {
    const clamped = clamp(Math.max(value, internalMin));
    setInternalMax(clamped);
    preview(internalMin, clamped);
  };

  const range = max - min || 1;
  const minPercent = ((internalMin - min) / range) * 100;
  const maxPercent = ((internalMax - min) / range) * 100;

  return (
    <div
      className="relative w-full py-4"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trilho base */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-neutral-200/90 z-0" />

      {/* Faixa ativa */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-2.5 rounded-full bg-gradient-to-r from-[#009B91] via-[#00736E] to-[#021616] shadow-[0_0_0_1px_rgba(0,155,145,0.25)] z-0"
        style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
      />

      {/* Range mínima */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={internalMin}
        onChange={(e) => handleMinChange(Number(e.target.value))}
        onMouseUp={() => commit(internalMin, internalMax)}
        onPointerUp={() => commit(internalMin, internalMax)}
        onTouchEnd={() => commit(internalMin, internalMax)}
        onKeyUp={() => commit(internalMin, internalMax)}
        className="zlw-range-overlay pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full bg-transparent z-20"
      />

      {/* Range máxima */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={internalMax}
        onChange={(e) => handleMaxChange(Number(e.target.value))}
        onMouseUp={() => commit(internalMin, internalMax)}
        onPointerUp={() => commit(internalMin, internalMax)}
        onTouchEnd={() => commit(internalMin, internalMax)}
        onKeyUp={() => commit(internalMin, internalMax)}
        className="zlw-range-overlay pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full bg-transparent z-10"
      />
    </div>
  );
}
