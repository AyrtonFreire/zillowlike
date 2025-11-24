"use client";

import React, { useEffect, useState } from "react";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  /** Valores atuais em reais (inteiros). null significa sem limite naquele lado */
  minValue: number | null | undefined;
  maxValue: number | null | undefined;
  onChange: (values: { min: number | null; max: number | null }) => void;
}

export default function PriceRangeSlider({
  min,
  max,
  step = 50000,
  minValue,
  maxValue,
  onChange,
}: PriceRangeSliderProps) {
  const [internalMin, setInternalMin] = useState<number>(minValue ?? min);
  const [internalMax, setInternalMax] = useState<number>(maxValue ?? max);

  useEffect(() => {
    setInternalMin(minValue ?? min);
  }, [minValue, min]);

  useEffect(() => {
    setInternalMax(maxValue ?? max);
  }, [maxValue, max]);

  const clamp = (value: number) => {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
  };

  const handleMinChange = (value: number) => {
    const clamped = clamp(Math.min(value, internalMax));
    setInternalMin(clamped);
    onChange({
      min: clamped <= min ? null : clamped,
      max: internalMax >= max ? null : internalMax,
    });
  };

  const handleMaxChange = (value: number) => {
    const clamped = clamp(Math.max(value, internalMin));
    setInternalMax(clamped);
    onChange({
      min: internalMin <= min ? null : internalMin,
      max: clamped >= max ? null : clamped,
    });
  };

  const range = max - min || 1;
  const minPercent = ((internalMin - min) / range) * 100;
  const maxPercent = ((internalMax - min) / range) * 100;

  return (
    <div className="relative w-full pt-4 pb-2">
      <div className="h-1 rounded-full bg-gray-200" />
      <div
        className="absolute h-1 bg-emerald-500 rounded-full"
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
        className="pointer-events-auto absolute -top-2 w-full h-1 bg-transparent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
      />

      {/* Range máxima */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={internalMax}
        onChange={(e) => handleMaxChange(Number(e.target.value))}
        className="pointer-events-auto absolute -top-2 w-full h-1 bg-transparent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
      />
    </div>
  );
}
