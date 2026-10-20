import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from '@rstest/core';

import {
  ReadingSchema,
  type Reading,
} from '../generated/restwell/v1/restwell_pb.js';
import {
  appendReading,
  bucketReadings,
  readingValue,
  summarize,
} from '../format/history.js';

// Verzonnen metingen, geen echte gegevens.
function reading(timestampMs: number, temperatureC?: number): Reading {
  return create(ReadingSchema, {
    roomId: 'room1',
    timestampMs: BigInt(timestampMs),
    temperatureC,
    humidityPercent: 45,
    lightRaw: 300,
  });
}

describe('readingValue', () => {
  test('geeft de waarde van de gekozen sensor', () => {
    const value = reading(0, 21);
    expect(readingValue(value, 'temperature')).toBe(21);
    expect(readingValue(value, 'humidity')).toBe(45);
    expect(readingValue(value, 'light')).toBe(300);
  });
});

describe('bucketReadings', () => {
  test('neemt per tijdvak het gemiddelde', () => {
    const readings = [reading(0, 20), reading(500, 22), reading(1000, 30)];
    const buckets = bucketReadings(readings, 'temperature', 0, 2000, 2);
    expect(buckets.map((bucket) => bucket.value)).toEqual([21, 30]);
    expect(buckets.map((bucket) => bucket.startMs)).toEqual([0, 1000]);
  });

  test('een tijdvak zonder metingen heeft geen waarde', () => {
    const buckets = bucketReadings([reading(0, 20)], 'temperature', 0, 2000, 2);
    expect(buckets[1]?.value).toBeUndefined();
  });

  test('negeert metingen buiten de periode en zonder waarde', () => {
    const readings = [
      reading(-1, 99),
      reading(100, undefined),
      reading(2000, 99),
    ];
    const buckets = bucketReadings(readings, 'temperature', 0, 2000, 1);
    expect(buckets[0]?.value).toBeUndefined();
  });
});

describe('summarize', () => {
  test('min, max en gemiddelde', () => {
    const summary = summarize(
      [reading(0, 18), reading(1, 24), reading(2, undefined), reading(3, 21)],
      'temperature',
    );
    expect(summary).toEqual({ count: 3, min: 18, max: 24, average: 21 });
  });

  test('zonder waarden', () => {
    expect(summarize([], 'temperature')).toEqual({ count: 0 });
  });
});

describe('appendReading', () => {
  test('voegt een nieuwere meting toe', () => {
    const result = appendReading([reading(0, 20)], reading(1000, 21), 5000);
    expect(result).toHaveLength(2);
  });

  test('negeert een meting die er al is', () => {
    const readings = [reading(1000, 20)];
    expect(appendReading(readings, reading(1000, 20), 5000)).toBe(readings);
  });

  test('laat metingen ouder dan het venster vallen', () => {
    const result = appendReading(
      [reading(0, 20), reading(4000, 21)],
      reading(6000, 22),
      5000,
    );
    expect(result.map((r) => Number(r.timestampMs))).toEqual([4000, 6000]);
  });
});
