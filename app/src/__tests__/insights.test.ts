import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from '@rstest/core';

import {
  AlarmSchema,
  AlarmStatus,
  Metric,
  ReadingSchema,
  ThresholdSchema,
  type Reading,
} from '../generated/restwell/v1/restwell_pb.js';
import type { Bucket } from '../format/history.js';
import {
  MAX_READING_GAP_MS,
  alarmFlags,
  formatDuration,
  insightSentence,
  timeOutside,
} from '../format/insights.js';

// Verzonnen drempels, metingen en alarmen, geen echte gegevens.
const MINUTE_MS = 60 * 1000;
const TEMPERATURE = create(ThresholdSchema, {
  roomId: 'room1',
  metric: Metric.TEMPERATURE,
  minValue: 18,
  maxValue: 24,
});

function reading(timestampMs: number, temperatureC: number): Reading {
  return create(ReadingSchema, {
    roomId: 'room1',
    timestampMs: BigInt(timestampMs),
    temperatureC,
  });
}

// Een meting per halve minuut, met de opgegeven temperaturen.
function series(...temperatures: number[]): Reading[] {
  const stepMs = MINUTE_MS / 2;
  return temperatures.map((temperature, index) =>
    reading(index * stepMs, temperature),
  );
}

describe('timeOutside', () => {
  test('telt de tijd tot de volgende meting', () => {
    // 4 halve minuten te warm, 2 halve minuten te koud; de laatste meting telt niet mee.
    const readings = series(25, 25, 25, 25, 17, 17, 21);
    expect(timeOutside(readings, 'temperature', TEMPERATURE)).toEqual({
      aboveMs: 2 * MINUTE_MS,
      belowMs: MINUTE_MS,
    });
  });

  test('een lange gap tussen metingen telt niet mee', () => {
    const readings = [reading(0, 30), reading(MAX_READING_GAP_MS + 1, 30)];
    expect(timeOutside(readings, 'temperature', TEMPERATURE).aboveMs).toBe(0);
  });
});

describe('formatDuration', () => {
  test('minuten en uren', () => {
    expect(formatDuration(20 * 1000)).toBe('minder dan 1 min');
    expect(formatDuration(12 * MINUTE_MS)).toBe('12 min');
    expect(formatDuration(65 * MINUTE_MS)).toBe('1 u 5 min');
    expect(formatDuration(120 * MINUTE_MS)).toBe('2 u');
  });
});

describe('insightSentence', () => {
  test('te warm en te koud', () => {
    const readings = series(25, 25, 17, 17, 21);
    expect(
      insightSentence('temperature', 'Afgelopen uur', readings, TEMPERATURE),
    ).toBe('Afgelopen uur 1 min te warm en 1 min te koud.');
  });

  test('altijd binnen de comfortzone', () => {
    expect(
      insightSentence(
        'temperature',
        'Afgelopen 24 uur',
        series(20, 21, 22),
        TEMPERATURE,
      ),
    ).toBe('Afgelopen 24 uur altijd binnen de comfortzone.');
  });

  test('zonder drempel of genoeg metingen', () => {
    expect(
      insightSentence('temperature', 'x', series(20, 21), undefined),
    ).toBeUndefined();
    expect(
      insightSentence('temperature', 'x', series(20), TEMPERATURE),
    ).toBeUndefined();
  });
});

describe('alarmFlags', () => {
  const buckets: Bucket[] = [0, 1000, 2000, 3000].map((startMs) => ({
    startMs,
  }));

  function alarm(metric: Metric, startedAtMs: bigint, resolvedAtMs?: bigint) {
    return create(AlarmSchema, {
      id: 1n,
      roomId: 'room1',
      metric,
      status:
        resolvedAtMs === undefined ? AlarmStatus.ACTIVE : AlarmStatus.RESOLVED,
      startedAtMs,
      resolvedAtMs,
    });
  }

  test('markeert de tijdvakken waarin het alarm liep', () => {
    const flags = alarmFlags(
      buckets,
      1000,
      [alarm(Metric.TEMPERATURE, 1500n, 2500n)],
      'temperature',
      4000,
    );
    expect(flags).toEqual([false, true, true, false]);
  });

  test('een alarm dat nog loopt, loopt tot nu', () => {
    const flags = alarmFlags(
      buckets,
      1000,
      [alarm(Metric.TEMPERATURE, 2500n)],
      'temperature',
      4000,
    );
    expect(flags).toEqual([false, false, true, true]);
  });

  test('alarmen van andere sensoren tellen niet', () => {
    const flags = alarmFlags(
      buckets,
      1000,
      [alarm(Metric.HUMIDITY, 0n, 4000n)],
      'temperature',
      4000,
    );
    expect(flags).toEqual([false, false, false, false]);
  });
});
