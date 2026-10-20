// Inzichten bij de grafiek: wanneer er een alarm actief was, en hoe lang een waarde buiten
// de comfortzone zat ("Afgelopen uur 12 min te warm"). Pure functies, zonder Lynx of netwerk.
import type {
  Alarm,
  Reading,
  Threshold,
} from '../generated/restwell/v1/restwell_pb.js';
import { readingValue, type Bucket, type ChartMetric } from './history.js';
import { toContractMetric } from './thresholds.js';

const MINUTE_MS = 60 * 1000;

// Ligt er meer tijd tussen twee metingen (Pi uit, verbinding weg), dan tellen we die gap niet
// mee: we weten niet wat de waarde toen was. De Pi meet om de paar seconden.
export const MAX_READING_GAP_MS = 30 * 1000;

/**
 * Per tijdvak of er toen een alarm van deze sensor actief was. Een alarm loopt van
 * `started_at_ms` tot `resolved_at_ms`, of tot `nowMs` als het nog niet opgelost is.
 */
export function alarmFlags(
  buckets: Bucket[],
  bucketMs: number,
  alarms: Alarm[],
  metric: ChartMetric,
  nowMs: number,
): boolean[] {
  const contractMetric = toContractMetric(metric);
  const periods = alarms
    .filter((alarm) => alarm.metric === contractMetric)
    .map((alarm) => ({
      startMs: Number(alarm.startedAtMs),
      endMs:
        alarm.resolvedAtMs === undefined ? nowMs : Number(alarm.resolvedAtMs),
    }));

  return buckets.map((bucket) => {
    const bucketEndMs = bucket.startMs + bucketMs;
    return periods.some(
      (period) =>
        period.startMs < bucketEndMs && period.endMs >= bucket.startMs,
    );
  });
}

export type TimeOutside = {
  aboveMs: number;
  belowMs: number;
};

/** Hoe lang de waarde boven het maximum en onder het minimum zat. */
export function timeOutside(
  readings: Reading[],
  metric: ChartMetric,
  threshold: Threshold,
): TimeOutside {
  let aboveMs = 0;
  let belowMs = 0;
  for (let index = 0; index < readings.length - 1; index++) {
    const current = readings[index];
    const next = readings[index + 1];
    if (!current || !next) continue;
    const value = readingValue(current, metric);
    if (value === undefined) continue;
    const gapMs = Number(next.timestampMs) - Number(current.timestampMs);
    if (gapMs <= 0 || gapMs > MAX_READING_GAP_MS) continue;
    if (threshold.maxValue !== undefined && value > threshold.maxValue)
      aboveMs += gapMs;
    if (threshold.minValue !== undefined && value < threshold.minValue)
      belowMs += gapMs;
  }
  return { aboveMs, belowMs };
}

/** Bv. `12 min`, `1 u 5 min`, `minder dan 1 min`. */
export function formatDuration(durationMs: number): string {
  if (durationMs < MINUTE_MS) return 'minder dan 1 min';
  const totalMinutes = Math.round(durationMs / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} u` : `${hours} u ${minutes} min`;
}

const DIRECTION_WORDS: Record<ChartMetric, { above: string; below: string }> = {
  temperature: { above: 'te warm', below: 'te koud' },
  humidity: { above: 'te vochtig', below: 'te droog' },
  light: { above: 'te fel', below: 'te donker' },
};

/**
 * Eén zin over de gekozen periode, bv. "Afgelopen uur 12 min te warm." of
 * "Afgelopen 24 uur altijd binnen de comfortzone." Leeg zonder drempel of metingen.
 */
export function insightSentence(
  metric: ChartMetric,
  since: string,
  readings: Reading[],
  threshold?: Threshold,
): string | undefined {
  if (!threshold || readings.length < 2) return undefined;
  const { aboveMs, belowMs } = timeOutside(readings, metric, threshold);
  const words = DIRECTION_WORDS[metric];
  const parts: string[] = [];
  if (aboveMs > 0) parts.push(`${formatDuration(aboveMs)} ${words.above}`);
  if (belowMs > 0) parts.push(`${formatDuration(belowMs)} ${words.below}`);
  if (parts.length === 0) return `${since} altijd binnen de comfortzone.`;
  return `${since} ${parts.join(' en ')}.`;
}
