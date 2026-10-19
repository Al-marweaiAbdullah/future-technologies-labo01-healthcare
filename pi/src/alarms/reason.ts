import type { SensorName } from "../db/index.ts";

type Direction = "too_low" | "too_high";

type ReasonLabels = { too_low: string; too_high: string; unit: string };

// Teksten voor de verpleging en de OLED. Licht en geluid zijn ruwe waarden, dus zonder eenheid.
const REASON_LABELS: Record<SensorName, ReasonLabels> = {
  temperature: { too_low: "Te koud", too_high: "Te warm", unit: " °C" },
  humidity: { too_low: "Te droog", too_high: "Te vochtig", unit: " %" },
  light: { too_low: "Te donker", too_high: "Licht te lang aan", unit: "" },
  sound: { too_low: "Te stil", too_high: "Te luid", unit: "" },
  motion: { too_low: "Beweging", too_high: "Beweging", unit: "" },
};

const MAX_DECIMALS = 1;

// Bv. "Te warm: 27,4 °C". Belgische notatie met een komma.
export function formatReason(sensor: SensorName, direction: Direction, value: number): string {
  const labels = REASON_LABELS[sensor];
  const formatted = value.toLocaleString("nl-BE", { maximumFractionDigits: MAX_DECIMALS });
  return `${labels[direction]}: ${formatted}${labels.unit}`;
}
