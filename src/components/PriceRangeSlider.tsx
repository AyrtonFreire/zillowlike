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
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-200/80 z-0" />

      {/* Faixa ativa */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_0_1px_rgba(16,185,129,0.45)] z-0"
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
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent z-20
          [&::-webkit-slider-thumb]:pointer-events-auto
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-emerald-600
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
          [&::-webkit-slider-thumb]:hover:scale-[1.05]
          [&::-webkit-slider-runnable-track]:appearance-none
          [&::-webkit-slider-runnable-track]:bg-transparent
          [&::-moz-range-thumb]:pointer-events-auto
          [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-emerald-600
          [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
          [&::-moz-range-thumb]:shadow-md
          [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:h-1.5"
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
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent z-10
          [&::-webkit-slider-thumb]:pointer-events-auto
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-emerald-600
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
          [&::-webkit-slider-thumb]:hover:scale-[1.05]
          [&::-webkit-slider-runnable-track]:appearance-none
          [&::-webkit-slider-runnable-track]:bg-transparent
          [&::-moz-range-thumb]:pointer-events-auto
          [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-emerald-600
          [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
          [&::-moz-range-thumb]:shadow-md
          [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:h-1.5"
      />
    </div>
  );
}
