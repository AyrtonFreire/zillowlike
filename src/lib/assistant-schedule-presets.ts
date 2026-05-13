export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WeekSchedule = Record<DayKey, DaySchedule>;

export type PresetKey = "always" | "off_hours" | "custom";

const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function buildUniform(start: string, end: string): WeekSchedule {
  return DAY_KEYS.reduce((acc, day) => {
    acc[day] = { enabled: true, start, end };
    return acc;
  }, {} as WeekSchedule);
}

export const PRESET_24_7: WeekSchedule = buildUniform("00:00", "23:59");

export const PRESET_OFF_HOURS: WeekSchedule = buildUniform("18:00", "08:00");

function equalsSchedule(a: WeekSchedule, b: WeekSchedule): boolean {
  for (const day of DAY_KEYS) {
    const ra = a[day];
    const rb = b[day];
    if (!ra || !rb) return false;
    if (ra.enabled !== rb.enabled || ra.start !== rb.start || ra.end !== rb.end) {
      return false;
    }
  }
  return true;
}

export function detectPreset(ws: WeekSchedule): PresetKey {
  if (equalsSchedule(ws, PRESET_24_7)) return "always";
  if (equalsSchedule(ws, PRESET_OFF_HOURS)) return "off_hours";
  return "custom";
}

export function applyPreset(key: Exclude<PresetKey, "custom">): WeekSchedule {
  if (key === "always") return { ...PRESET_24_7 };
  return { ...PRESET_OFF_HOURS };
}

export function summarizeWeekSchedule(ws: WeekSchedule): { headline: string; detail: string } {
  const preset = detectPreset(ws);
  if (preset === "always") {
    return { headline: "Sempre ativo", detail: "Responde 24h, todos os dias" };
  }
  if (preset === "off_hours") {
    return { headline: "Fora do expediente", detail: "Responde das 18:00 às 08:00, todos os dias" };
  }
  const activeDays = DAY_KEYS.filter((d) => ws[d]?.enabled).length;
  if (activeDays === 0) {
    return { headline: "Nenhum horário ativo", detail: "Configure ao menos um dia para responder" };
  }
  return {
    headline: "Personalizado",
    detail: `${activeDays} ${activeDays === 1 ? "dia ativo" : "dias ativos"} na semana`,
  };
}
