import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from '@rstest/core';

import {
  Metric,
  ThresholdSchema,
} from '../generated/restwell/v1/restwell_pb.js';
import {
  parseThresholdInput,
  toThresholdInput,
} from '../format/thresholdInput.js';

// Verzonnen drempel, geen echte gegevens.
const CURRENT = create(ThresholdSchema, {
  roomId: 'room1',
  metric: Metric.TEMPERATURE,
  minValue: 18,
  maxValue: 24.5,
});

describe('toThresholdInput', () => {
  test('toont de huidige waarden met een komma; leeg zonder waarde', () => {
    expect(toThresholdInput(CURRENT)).toEqual({
      min: '18',
      max: '24,5',
      durationSec: '',
    });
  });
});

describe('parseThresholdInput', () => {
  test('geldige invoer, ook met een komma', () => {
    const result = parseThresholdInput(CURRENT, {
      min: '17,5',
      max: '26',
      durationSec: '30',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.threshold.roomId).toBe('room1');
    expect(result.threshold.metric).toBe(Metric.TEMPERATURE);
    expect(result.threshold.minValue).toBe(17.5);
    expect(result.threshold.maxValue).toBe(26);
    expect(result.threshold.maxDurationSec).toBe(30);
  });

  test('een leeg veld betekent geen grens', () => {
    const result = parseThresholdInput(CURRENT, {
      min: '',
      max: '900',
      durationSec: '',
    });
    expect(result.ok && result.threshold.minValue).toBeUndefined();
  });

  test('foutmeldingen', () => {
    const parse = (min: string, max: string, durationSec = '') =>
      parseThresholdInput(CURRENT, { min, max, durationSec });
    expect(parse('abc', '24')).toEqual({
      ok: false,
      error: 'Minimum is geen getal',
    });
    expect(parse('', '')).toEqual({
      ok: false,
      error: 'Vul een minimum of een maximum in',
    });
    expect(parse('25', '20')).toEqual({
      ok: false,
      error: 'Het minimum mag niet boven het maximum liggen',
    });
    expect(parse('18', '24', '-5')).toEqual({
      ok: false,
      error: 'Duur is een geheel aantal seconden (0 of meer)',
    });
    expect(parse('18', '24', '1,5')).toEqual({
      ok: false,
      error: 'Duur is een geheel aantal seconden (0 of meer)',
    });
  });
});
