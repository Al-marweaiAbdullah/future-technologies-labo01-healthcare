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
      fromHour: '',
      toHour: '',
    });
  });

  test('toont de actieve uren', () => {
    const light = create(ThresholdSchema, {
      ...CURRENT,
      activeFromHour: 22,
      activeToHour: 7,
    });
    expect(toThresholdInput(light)).toMatchObject({
      fromHour: '22',
      toHour: '7',
    });
  });
});

describe('parseThresholdInput', () => {
  test('geldige invoer, ook met een komma', () => {
    const result = parseThresholdInput(CURRENT, {
      min: '17,5',
      max: '26',
      durationSec: '30',
      fromHour: '',
      toHour: '',
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
      fromHour: '',
      toHour: '',
    });
    expect(result.ok && result.threshold.minValue).toBeUndefined();
  });

  test('foutmeldingen', () => {
    const parse = (min: string, max: string, durationSec = '') =>
      parseThresholdInput(CURRENT, {
        min,
        max,
        durationSec,
        fromHour: '',
        toHour: '',
      });
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

  describe('actieve uren', () => {
    const parseHours = (fromHour: string, toHour: string, current = CURRENT) =>
      parseThresholdInput(current, {
        min: '',
        max: '900',
        durationSec: '60',
        fromHour,
        toHour,
      });

    test('stuurt de uren mee, ook over middernacht', () => {
      const result = parseHours('22', '7');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.threshold.activeFromHour).toBe(22);
      expect(result.threshold.activeToHour).toBe(7);
    });

    test('geen uren = altijd actief', () => {
      const result = parseHours('', '');
      expect(result.ok && result.threshold.activeFromHour).toBeUndefined();
    });

    test('foutmeldingen', () => {
      const bothOrNone = {
        ok: false,
        error: 'Vul het begin- en einduur van de nachtrust in',
      };
      const wholeHour = {
        ok: false,
        error: 'Een uur is een geheel getal van 0 tot 23',
      };
      expect(parseHours('22', '')).toEqual(bothOrNone);
      expect(parseHours('', '7')).toEqual(bothOrNone);
      expect(parseHours('24', '7')).toEqual(wholeHour);
      expect(parseHours('-1', '7')).toEqual(wholeHour);
      expect(parseHours('22,5', '7')).toEqual(wholeHour);
      expect(parseHours('nacht', '7')).toEqual(wholeHour);
      expect(parseHours('7', '7')).toEqual({
        ok: false,
        error: 'Begin- en einduur mogen niet gelijk zijn',
      });
    });

    test('bestaande uren leegmaken kan nog niet', () => {
      const night = create(ThresholdSchema, {
        ...CURRENT,
        activeFromHour: 22,
        activeToHour: 7,
      });
      expect(parseHours('', '', night)).toEqual({
        ok: false,
        error: 'De nachtrust leegmaken kan nog niet vanuit de app',
      });
    });
  });
});
