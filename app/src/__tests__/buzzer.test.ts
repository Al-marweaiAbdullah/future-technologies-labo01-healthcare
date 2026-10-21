import { create, type MessageInitShape } from '@bufbuild/protobuf';
import { expect, test } from '@rstest/core';

import {
  AlarmSchema,
  AlarmStatus,
  Metric,
} from '../generated/restwell/v1/restwell_pb.js';
import { buzzerSecondsLeft, formatBuzzerCountdown } from '../format/buzzer.js';

// Verzonnen testdata, geen echte metingen.
const STARTED_AT_MS = 1_000_000;
const SEC = 1000;

function alarm(overrides: MessageInitShape<typeof AlarmSchema> = {}) {
  return create(AlarmSchema, {
    id: 1n,
    roomId: 'room1',
    metric: Metric.TEMPERATURE,
    reason: 'Temperatuur te hoog',
    status: AlarmStatus.ACTIVE,
    startedAtMs: BigInt(STARTED_AT_MS),
    buzzerAfterSec: 60,
    ...overrides,
  });
}

test('telt af tot buzzer_after_sec na het begin van het alarm', () => {
  expect(buzzerSecondsLeft(alarm(), STARTED_AT_MS)).toBe(60);
  expect(buzzerSecondsLeft(alarm(), STARTED_AT_MS + 15 * SEC)).toBe(45);
  expect(buzzerSecondsLeft(alarm(), STARTED_AT_MS + 59.5 * SEC)).toBe(1);
});

test('na buzzer_after_sec gaat de buzzer af', () => {
  expect(buzzerSecondsLeft(alarm(), STARTED_AT_MS + 60 * SEC)).toBe(0);
  expect(formatBuzzerCountdown([alarm()], STARTED_AT_MS + 90 * SEC)).toBe(
    'Buzzer gaat af',
  );
});

test('een gezien of opgelost alarm laat de buzzer niet afgaan', () => {
  const seen = alarm({ status: AlarmStatus.ACKNOWLEDGED });
  const resolved = alarm({ status: AlarmStatus.RESOLVED });

  expect(formatBuzzerCountdown([seen], STARTED_AT_MS)).toBeUndefined();
  expect(formatBuzzerCountdown([resolved], STARTED_AT_MS)).toBeUndefined();
});

test('toont seconden, en minuten bij een lange wachttijd', () => {
  expect(formatBuzzerCountdown([alarm()], STARTED_AT_MS + 15 * SEC)).toBe(
    'Buzzer over 45 s',
  );
  expect(
    formatBuzzerCountdown([alarm({ buzzerAfterSec: 125 })], STARTED_AT_MS),
  ).toBe('Buzzer over 2 min 05 s');
});

test('bij meerdere alarmen telt het alarm dat het eerst de buzzer laat afgaan', () => {
  const older = alarm({ id: 1n, status: AlarmStatus.RESOLVED });
  const later = alarm({
    id: 2n,
    startedAtMs: BigInt(STARTED_AT_MS + 30 * SEC),
  });
  const soonest = alarm({ id: 3n, buzzerAfterSec: 20 });

  expect(formatBuzzerCountdown([older, later, soonest], STARTED_AT_MS)).toBe(
    'Buzzer over 20 s',
  );
});
