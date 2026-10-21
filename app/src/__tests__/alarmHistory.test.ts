import { create, type MessageInitShape } from '@bufbuild/protobuf';
import { expect, test } from '@rstest/core';

import {
  AlarmSchema,
  AlarmStatus,
  Metric,
} from '../generated/restwell/v1/restwell_pb.js';
import {
  alarmHistoryKey,
  filterAlarms,
  formatAlarmPeriod,
} from '../format/alarmHistory.js';
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

const ACKNOWLEDGED_AT_MS = 1_100_000n;

const filterable = [
  alarm({ id: 1n }),
  alarm({
    id: 2n,
    metric: Metric.HUMIDITY,
    status: AlarmStatus.ACKNOWLEDGED,
    acknowledgedAtMs: ACKNOWLEDGED_AT_MS,
  }),
  alarm({
    id: 3n,
    status: AlarmStatus.RESOLVED,
    resolvedAtMs: RESOLVED_AT_MS,
  }),
  alarm({
    id: 4n,
    metric: Metric.LIGHT,
    status: AlarmStatus.RESOLVED,
    acknowledgedAtMs: ACKNOWLEDGED_AT_MS,
    resolvedAtMs: RESOLVED_AT_MS,
  }),
];

function ids(filter: Parameters<typeof filterAlarms>[1]) {
  return filterAlarms(filterable, filter).map((a) => Number(a.id));
}

test('filterAlarms zonder filter laat alles door, in dezelfde volgorde', () => {
  expect(ids({ status: 'all' })).toEqual([1, 2, 3, 4]);
});

test('filterAlarms filtert op sensor', () => {
  expect(ids({ metric: Metric.TEMPERATURE, status: 'all' })).toEqual([1, 3]);
  expect(ids({ metric: Metric.MOTION, status: 'all' })).toEqual([]);
});

test('filterAlarms filtert op status', () => {
  expect(ids({ status: 'open' })).toEqual([1]);
  expect(ids({ status: 'resolved' })).toEqual([3, 4]);
});

test('filterAlarms combineert sensor en status', () => {
  expect(ids({ metric: Metric.TEMPERATURE, status: 'resolved' })).toEqual([3]);
});

test('formatAlarmPeriod zet met withDate de dag voor de tijd', () => {
  const day = new Date(Number(STARTED_AT_MS));
  expect(formatAlarmPeriod(alarm(), true)).toBe(
    `sinds ${day.getDate()}/${day.getMonth() + 1} ${formatTime(STARTED_AT_MS)}`,
  );
});
