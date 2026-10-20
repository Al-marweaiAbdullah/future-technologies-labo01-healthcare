import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from '@rstest/core';

import {
  Metric,
  ReadingSchema,
  ThresholdSchema,
  type Reading,
} from '../generated/restwell/v1/restwell_pb.js';
import {
  formatRange,
  fractionInside,
  isOutside,
  thresholdFor,
} from '../format/thresholds.js';

// Verzonnen drempels en metingen, geen echte gegevens.
const TEMPERATURE = create(ThresholdSchema, {
  roomId: 'room1',
  metric: Metric.TEMPERATURE,
  minValue: 18,
  maxValue: 24,
});
const LIGHT = create(ThresholdSchema, {
  roomId: 'room1',
  metric: Metric.LIGHT,
  maxValue: 900,
  maxDurationSec: 60,
});

function reading(temperatureC?: number): Reading {
  return create(ReadingSchema, { roomId: 'room1', temperatureC });
}

const plain = (value: number) => String(value);

describe('thresholdFor', () => {
  test('zoekt de drempel van de sensor', () => {
    expect(thresholdFor([TEMPERATURE, LIGHT], 'light')).toBe(LIGHT);
    expect(thresholdFor([TEMPERATURE], 'humidity')).toBeUndefined();
  });
});

describe('isOutside', () => {
  test('onder het minimum of boven het maximum', () => {
    expect(isOutside(17.9, TEMPERATURE)).toBe(true);
    expect(isOutside(24.1, TEMPERATURE)).toBe(true);
  });

  test('de grenzen zelf horen bij de comfortzone', () => {
    expect(isOutside(18, TEMPERATURE)).toBe(false);
    expect(isOutside(24, TEMPERATURE)).toBe(false);
  });

  test('alleen een maximum', () => {
    expect(isOutside(0, LIGHT)).toBe(false);
    expect(isOutside(950, LIGHT)).toBe(true);
  });

  test('zonder waarde of drempel', () => {
    expect(isOutside(undefined, TEMPERATURE)).toBe(false);
    expect(isOutside(30, undefined)).toBe(false);
  });
});

describe('formatRange', () => {
  test('minimum en maximum', () => {
    expect(formatRange(TEMPERATURE, plain)).toBe('18 – 24');
  });

  test('alleen een maximum', () => {
    expect(formatRange(LIGHT, plain)).toBe('max 900');
  });

  test('zonder drempel', () => {
    expect(formatRange(undefined, plain)).toBeUndefined();
  });
});

describe('fractionInside', () => {
  test('aandeel binnen de comfortzone', () => {
    const readings = [
      reading(20),
      reading(22),
      reading(25),
      reading(undefined),
    ];
    expect(fractionInside(readings, 'temperature', TEMPERATURE)).toBe(2 / 3);
  });

  test('zonder drempel of metingen', () => {
    expect(
      fractionInside([reading(20)], 'temperature', undefined),
    ).toBeUndefined();
    expect(fractionInside([], 'temperature', TEMPERATURE)).toBeUndefined();
  });
});
