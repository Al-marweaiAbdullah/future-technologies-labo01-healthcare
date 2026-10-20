// Rekent een reeks metingen om naar wat de grafiek en de samenvatting tonen.
// Pure functies, zonder Lynx of netwerk, zodat ze makkelijk te testen zijn.
import type { Reading } from '../generated/restwell/v1/restwell_pb.js';

export type ChartMetric = 'temperature' | 'humidity' | 'light';

export const CHART_METRICS: ChartMetric[] = [
  'temperature',
  'humidity',
  'light',
];

export function readingValue(
  reading: Reading,
  metric: ChartMetric,
): number | undefined {
  switch (metric) {
    case 'temperature':
      return reading.temperatureC;
    case 'humidity':
      return reading.humidityPercent;
    case 'light':
      return reading.lightRaw;
  }
}

export type Bucket = {
  startMs: number;
  /** Gemiddelde van de metingen in dit tijdvak; leeg als er geen waren. */
  value?: number;
};

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Verdeelt de periode [fromMs, toMs) in `bucketCount` even lange tijdvakken en neemt per
 * tijdvak het gemiddelde. Zo blijft de grafiek leesbaar, ook met een meting per seconde.
 */
export function bucketReadings(
  readings: Reading[],
  metric: ChartMetric,
  fromMs: number,
  toMs: number,
  bucketCount: number,
): Bucket[] {
  const bucketMs = (toMs - fromMs) / bucketCount;
  const valuesPerBucket: number[][] = Array.from(
    { length: bucketCount },
    () => [],
  );

  for (const reading of readings) {
    const value = readingValue(reading, metric);
    const timestampMs = Number(reading.timestampMs);
    if (value === undefined || timestampMs < fromMs || timestampMs >= toMs)
      continue;
    const index = Math.floor((timestampMs - fromMs) / bucketMs);
    valuesPerBucket[index]?.push(value);
  }

  return valuesPerBucket.map((values, index) => ({
    startMs: fromMs + index * bucketMs,
    value: average(values),
  }));
}

export type Summary = {
  count: number;
  min?: number;
  max?: number;
  average?: number;
};

export function summarize(readings: Reading[], metric: ChartMetric): Summary {
  const values = readings
    .map((reading) => readingValue(reading, metric))
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) return { count: 0 };
  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    average: average(values),
  };
}

/**
 * Voegt een nieuwe live meting toe en laat metingen vallen die ouder zijn dan `windowMs`.
 * Een meting die al in de lijst staat (zelfde of ouder tijdstip), wordt genegeerd.
 */
export function appendReading(
  readings: Reading[],
  reading: Reading,
  windowMs: number,
): Reading[] {
  const last = readings[readings.length - 1];
  if (last && reading.timestampMs <= last.timestampMs) return readings;
  const oldestMs = Number(reading.timestampMs) - windowMs;
  return [...readings, reading].filter(
    (existing) => Number(existing.timestampMs) >= oldestMs,
  );
}
