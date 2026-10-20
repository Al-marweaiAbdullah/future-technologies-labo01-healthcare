import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from '@rstest/core';

import {
  AlarmSchema,
  AlarmStatus,
  Metric,
} from '../generated/restwell/v1/restwell_pb.js';
import { groupAlarmsByMetric } from '../format/alarmGroups.js';

// Verzonnen alarmen, geen echte gegevens.
function alarm(
  id: bigint,
  metric: Metric,
  startedAtMs: bigint,
  status = AlarmStatus.ACTIVE,
) {
  return create(AlarmSchema, {
    id,
    roomId: 'room1',
    metric,
    reason: 'test',
    status,
    startedAtMs,
  });
}

describe('groupAlarmsByMetric', () => {
  test('één groep per sensor', () => {
    const groups = groupAlarmsByMetric([
      alarm(1n, Metric.TEMPERATURE, 1000n, AlarmStatus.RESOLVED),
      alarm(2n, Metric.HUMIDITY, 1500n),
      alarm(3n, Metric.TEMPERATURE, 2000n),
    ]);
    expect(groups.map((group) => group.metric)).toEqual([
      Metric.TEMPERATURE,
      Metric.HUMIDITY,
    ]);
  });

  test('de kaart toont het nieuwste alarm, met alle alarmen van die sensor', () => {
    const [group] = groupAlarmsByMetric([
      alarm(3n, Metric.TEMPERATURE, 3000n),
      alarm(1n, Metric.TEMPERATURE, 1000n, AlarmStatus.RESOLVED),
      alarm(2n, Metric.TEMPERATURE, 2000n, AlarmStatus.RESOLVED),
    ]);
    expect(group?.latest.id).toBe(3n);
    expect(group?.alarms.map((a) => a.id)).toEqual([1n, 2n, 3n]);
    expect(group?.firstStartedAtMs).toBe(1000n);
  });

  test('zonder alarmen', () => {
    expect(groupAlarmsByMetric([])).toEqual([]);
  });
});
