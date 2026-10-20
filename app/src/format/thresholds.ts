// Drempels (comfortzone) vergelijken met meetwaarden. Pure functies, zonder Lynx of netwerk.
// De drempels zelf komen van de Pi (ListThresholds); de bronnen staan in pi/src/db/README.md.
import {
  Metric,
  type Reading,
  type Threshold,
} from '../generated/restwell/v1/restwell_pb.js';
import { readingValue, type ChartMetric } from './history.js';

const CONTRACT_METRICS: Record<ChartMetric, Metric> = {
  temperature: Metric.TEMPERATURE,
  humidity: Metric.HUMIDITY,
  light: Metric.LIGHT,
};

export function toContractMetric(metric: ChartMetric): Metric {
  return CONTRACT_METRICS[metric];
}

export function thresholdFor(
  thresholds: Threshold[],
  metric: ChartMetric,
): Threshold | undefined {
  return thresholds.find(
    (threshold) => threshold.metric === CONTRACT_METRICS[metric],
  );
}

/**
 * Of een waarde buiten de comfortzone valt. Zonder waarde of drempel: nee.
 * Let op: een alarm komt soms pas na `max_duration_sec`; dit kijkt alleen naar de waarde.
 */
export function isOutside(value?: number, threshold?: Threshold): boolean {
  if (value === undefined || threshold === undefined) return false;
  if (threshold.minValue !== undefined && value < threshold.minValue)
    return true;
  if (threshold.maxValue !== undefined && value > threshold.maxValue)
    return true;
  return false;
}

/** Bv. `18,0 °C – 24,0 °C`, `max 900`; leeg zonder drempel. */
export function formatRange(
  threshold: Threshold | undefined,
  format: (value: number) => string,
): string | undefined {
  const min = threshold?.minValue;
  const max = threshold?.maxValue;
  if (min !== undefined && max !== undefined)
    return `${format(min)} – ${format(max)}`;
  if (min !== undefined) return `min ${format(min)}`;
  if (max !== undefined) return `max ${format(max)}`;
  return undefined;
}

/** Aandeel van de metingen (0 tot 1) binnen de comfortzone; leeg zonder drempel of metingen. */
export function fractionInside(
  readings: Reading[],
  metric: ChartMetric,
  threshold?: Threshold,
): number | undefined {
  if (!threshold) return undefined;
  const values = readings
    .map((reading) => readingValue(reading, metric))
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  const insideCount = values.filter(
    (value) => !isOutside(value, threshold),
  ).length;
  return insideCount / values.length;
}
