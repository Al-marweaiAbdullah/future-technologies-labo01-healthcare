import { create, type MessageInitShape } from '@bufbuild/protobuf';
import { expect, test } from '@rstest/core';

import {
  AlarmSchema,
  AlarmStatus,
  Metric,
} from '../generated/restwell/v1/restwell_pb.js';
import { alarmDetail, isSensorOffline } from '../format/alarmDetail.js';

// Verzonnen testdata, geen echte metingen.
function alarm(overrides: MessageInitShape<typeof AlarmSchema> = {}) {
  return create(AlarmSchema, {
    id: 1n,
    roomId: 'room1',
    metric: Metric.TEMPERATURE,
    reason: 'Te warm: 27,4 °C',
    value: 27.4,
    status: AlarmStatus.ACTIVE,
    startedAtMs: 1_000_000n,
    buzzerAfterSec: 60,
    ...overrides,
  });
}

test('een alarm met een waarde is een drempelalarm, geen uitgevallen sensor', () => {
  expect(isSensorOffline(alarm())).toBe(false);
  expect(isSensorOffline(alarm({ value: 0 }))).toBe(false);
});

test('een alarm zonder waarde betekent dat de sensor niets meer doorgeeft', () => {
  expect(isSensorOffline(alarm({ value: undefined }))).toBe(true);
});

test('drempelalarm: sensor en waarde in de eenheid van de sensor', () => {
  expect(alarmDetail(alarm())).toBe('Temperatuur: 27,4 °C');
});

test('uitgevallen sensor: zegt wat er moet gebeuren in plaats van een streepje', () => {
  const detail = alarmDetail(
    alarm({
      metric: Metric.HUMIDITY,
      reason: 'Luchtvochtigheidssensor geeft geen waarde',
      value: undefined,
    }),
  );

  expect(detail).toBe('Luchtvochtigheid: controleer de sensor');
});
