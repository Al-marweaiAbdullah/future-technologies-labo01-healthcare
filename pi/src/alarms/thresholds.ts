import type { ThresholdRow } from "../db/index.ts";
import type { ThresholdCheck } from "./types.ts";

// Een grens zonder waarde (null) wordt niet gecontroleerd.
export function checkThreshold(value: number, threshold: ThresholdRow): ThresholdCheck {
  if (threshold.min_value !== null && value < threshold.min_value) return "too_low";
  if (threshold.max_value !== null && value > threshold.max_value) return "too_high";
  return "ok";
}

// Geldt de regel op dit uur (0-23, lokale tijd)? Zonder actieve uren geldt ze altijd.
// Van 22 tot 7 loopt over middernacht: 22:00-23:59 en 00:00-06:59. Het eind-uur telt niet mee.
export function isActiveAtHour(threshold: ThresholdRow, hour: number): boolean {
  const { active_from_hour: from, active_to_hour: to } = threshold;
  if (from === null || to === null) return true;
  if (from < to) return hour >= from && hour < to;
  return hour >= from || hour < to;
}
