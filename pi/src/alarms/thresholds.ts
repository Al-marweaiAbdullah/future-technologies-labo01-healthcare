import type { ThresholdRow } from "../db/index.ts";
import type { ThresholdCheck } from "./types.ts";

// Een grens zonder waarde (null) wordt niet gecontroleerd.
export function checkThreshold(value: number, threshold: ThresholdRow): ThresholdCheck {
  if (threshold.min_value !== null && value < threshold.min_value) return "too_low";
  if (threshold.max_value !== null && value > threshold.max_value) return "too_high";
  return "ok";
}
