import { describe, expect, test } from '@rstest/core';

import { AlarmStatus, Metric } from '../generated/restwell/v1/restwell_pb.js';
import {
  MISSING_VALUE,
  alarmStatusLabel,
  formatAlarmCount,
  formatHumidity,
  formatLight,
  formatMetricValue,
  formatMotion,
  formatSound,
  formatTemperature,
  formatTime,
  metricLabel,
} from '../format/measurements.js';

describe('meetwaarden', () => {
  test('temperatuur met één decimaal en een komma', () => {
    expect(formatTemperature(21.46)).toBe('21,5 °C');
    expect(formatTemperature(0)).toBe('0,0 °C');
  });

  test('ontbrekende waarden tonen een streepje', () => {
    expect(formatTemperature(undefined)).toBe(MISSING_VALUE);
    expect(formatHumidity(undefined)).toBe(MISSING_VALUE);
    expect(formatLight(undefined)).toBe(MISSING_VALUE);
    expect(formatSound(undefined)).toBe(MISSING_VALUE);
    expect(formatMotion(undefined)).toBe(MISSING_VALUE);
  });

  test('luchtvochtigheid, licht en geluid', () => {
    expect(formatHumidity(44.6)).toBe('45 %');
    expect(formatLight(300)).toBe('300 lux');
    expect(formatSound(62)).toBe('62 dB');
  });

  test('beweging', () => {
    expect(formatMotion(true)).toBe('Beweging');
    expect(formatMotion(false)).toBe('Geen beweging');
  });

  test('tijdstip als HH:MM', () => {
    const timestamp = new Date(2026, 9, 20, 7, 5).getTime();
    expect(formatTime(BigInt(timestamp))).toBe('07:05');
  });
});

describe('alarmen', () => {
  test('naam van de sensor', () => {
    expect(metricLabel(Metric.TEMPERATURE)).toBe('Temperatuur');
    expect(metricLabel(Metric.SOUND)).toBe('Geluid');
  });

  test('waarde in de eenheid van de sensor', () => {
    expect(formatMetricValue(Metric.TEMPERATURE, 26)).toBe('26,0 °C');
    expect(formatMetricValue(Metric.SOUND, 80)).toBe('80 dB');
    expect(formatMetricValue(Metric.MOTION, 1)).toBe('Beweging');
    expect(formatMetricValue(Metric.HUMIDITY, undefined)).toBe(MISSING_VALUE);
  });

  test('status', () => {
    expect(alarmStatusLabel(AlarmStatus.ACTIVE)).toBe('Actief');
    expect(alarmStatusLabel(AlarmStatus.ACKNOWLEDGED)).toBe('Gezien');
  });

  test('aantal alarmen', () => {
    expect(formatAlarmCount(0)).toBe('Alles in orde');
    expect(formatAlarmCount(1)).toBe('1 alarm');
    expect(formatAlarmCount(3)).toBe('3 alarmen');
  });
});
