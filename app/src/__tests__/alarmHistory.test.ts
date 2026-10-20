import { create, type MessageInitShape } from '@bufbuild/protobuf';
import { expect, test } from '@rstest/core';

import {
  AlarmSchema,
  AlarmStatus,
  Metric,
} from '../generated/restwell/v1/restwell_pb.js';
import { alarmHistoryKey, formatAlarmPeriod } from '../format/alarmHistory.js';
import { formatTime } from '../format/measurements.js';

// Verzonnen testdata, geen echte metingen.
const STARTED_AT_MS = 1_000_000n;
const RESOLVED_AT_MS = 1_600_000n;

function alarm(overrides: MessageInitShape<typeof AlarmSchema> = {}) {
  return create(AlarmSchema, {
    id: 1n,
    roomId: 'room1',
    metric: Metric.TEMPERATURE,
    reason: 'Temperatuur te hoog',
    status: AlarmStatus.ACTIVE,
    startedAtMs: STARTED_AT_MS,
    ...overrides,
  });
}

test('formatAlarmPeriod toont begin en einde van een opgelost alarm', () => {
  const resolved = alarm({
    status: AlarmStatus.RESOLVED,
    resolvedAtMs: RESOLVED_AT_MS,
  });
  expect(formatAlarmPeriod(resolved)).toBe(
    `${formatTime(STARTED_AT_MS)}–${formatTime(RESOLVED_AT_MS)}`,
  );
});

test('formatAlarmPeriod toont "sinds" voor een alarm dat nog loopt', () => {
  expect(formatAlarmPeriod(alarm())).toBe(`sinds ${formatTime(STARTED_AT_MS)}`);
});

test('alarmHistoryKey verandert als een alarm gezien of opgelost wordt', () => {
  const active = alarmHistoryKey([alarm()]);
  const seen = alarmHistoryKey([
    alarm({ status: AlarmStatus.ACKNOWLEDGED, acknowledgedAtMs: 1_200_000n }),
  ]);
  const gone = alarmHistoryKey([]);

  expect(new Set([active, seen, gone]).size).toBe(3);
  expect(alarmHistoryKey([alarm()])).toBe(active);
});
