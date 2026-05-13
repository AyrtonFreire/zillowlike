"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Moon, Settings2, Zap } from "lucide-react";
import {
  applyPreset,
  detectPreset,
  summarizeWeekSchedule,
  type DayKey,
  type PresetKey,
  type WeekSchedule,
} from "@/lib/assistant-schedule-presets";

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Seg",
  tue: "Ter",
  wed: "Qua",
  thu: "Qui",
  fri: "Sex",
  sat: "Sáb",
  sun: "Dom",
};

const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

interface AssistantAvailabilityProps {
  value: WeekSchedule;
  onChange: (next: WeekSchedule) => void;
}

export default function AssistantAvailability({ value, onChange }: AssistantAvailabilityProps) {
  const preset = detectPreset(value);
  const summary = summarizeWeekSchedule(value);
  const [expanded, setExpanded] = useState<boolean>(preset === "custom");

  const handlePreset = (key: Exclude<PresetKey, "custom">) => {
    onChange(applyPreset(key));
  };

  const updateDay = (day: DayKey, patch: Partial<WeekSchedule[DayKey]>) => {
    onChange({
      ...value,
      [day]: { ...value[day], ...patch },
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Disponibilidade</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{summary.headline}</div>
          <div className="text-xs text-gray-600">{summary.detail}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handlePreset("always")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            preset === "always"
              ? "bg-teal-600 text-white shadow-sm"
              : "border border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          Ativar 24/7
        </button>
        <button
          type="button"
          onClick={() => handlePreset("off_hours")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            preset === "off_hours"
              ? "bg-slate-900 text-white shadow-sm"
              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Moon className="h-3.5 w-3.5" />
          Fora do expediente
        </button>
        {preset === "custom" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            <Settings2 className="h-3.5 w-3.5" />
            Personalizado
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? "Ocultar edição manual" : "Editar horários personalizados"}
      </button>

      {expanded ? (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center text-xs font-semibold text-gray-500">
            <div />
            <div />
            <div>Início</div>
            <div>Fim</div>
            <div />
          </div>
          {DAY_KEYS.map((day) => {
            const row = value[day];
            return (
              <div key={day} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                <div className="text-sm font-medium text-gray-700">{DAY_LABELS[day]}</div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  Ativo
                </label>
                <input
                  type="time"
                  value={row.start}
                  disabled={!row.enabled}
                  onChange={(e) => updateDay(day, { start: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                />
                <input
                  type="time"
                  value={row.end}
                  disabled={!row.enabled}
                  onChange={(e) => updateDay(day, { end: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                />
                <div className="text-xs text-gray-500">{row.enabled ? "" : "Fora do horário"}</div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
