import { create } from '@bufbuild/protobuf';
import { expect, test } from '@rstest/core';

import {
  AlarmSchema,
  AlarmStatus,
  Metric,
  ReadingSchema,
} from '../generated/restwell/v1/restwell_pb.js';
import {
  INITIAL_ROOM_STATE,
  applyRoomEvent,
  withOpenAlarms,
} from '../grpc/roomState.js';

// Verzonnen testdata, geen echte metingen.
function alarm(id: bigint, startedAtMs: bigint, status = AlarmStatus.ACTIVE) {
  return create(AlarmSchema, {
    id,
    roomId: 'room1',
    metric: Metric.TEMPERATURE,
    reason: 'Temperatuur te hoog',
    status,
    startedAtMs,
  });
}

test('een meting vervangt de vorige', () => {
  const first = create(ReadingSchema, { roomId: 'room1', temperatureC: 21 });
  const second = create(ReadingSchema, { roomId: 'room1', temperatureC: 22 });

  let state = applyRoomEvent(INITIAL_ROOM_STATE, {
    case: 'reading',
    value: first,
  });
  state = applyRoomEvent(state, { case: 'reading', value: second });

  expect(state.reading?.temperatureC).toBe(22);
});

test('een nieuw alarm komt erbij, oudste eerst', () => {
  let state = withOpenAlarms(INITIAL_ROOM_STATE, [alarm(2n, 2000n)]);
  state = applyRoomEvent(state, { case: 'alarm', value: alarm(1n, 1000n) });

  expect(state.alarms.map((a) => a.id)).toEqual([1n, 2n]);
});

test('een gewijzigd alarm vervangt de oude versie', () => {
  let state = withOpenAlarms(INITIAL_ROOM_STATE, [alarm(1n, 1000n)]);
  state = applyRoomEvent(state, {
    case: 'alarm',
    value: alarm(1n, 1000n, AlarmStatus.ACKNOWLEDGED),
  });

  expect(state.alarms).toHaveLength(1);
  expect(state.alarms[0]?.status).toBe(AlarmStatus.ACKNOWLEDGED);
});

test('een opgelost alarm dat niemand zag blijft staan', () => {
  let state = withOpenAlarms(INITIAL_ROOM_STATE, [alarm(1n, 1000n)]);
  state = applyRoomEvent(state, {
    case: 'alarm',
    value: alarm(1n, 1000n, AlarmStatus.RESOLVED),
  });

  expect(state.alarms).toHaveLength(1);
  expect(state.alarms[0]?.status).toBe(AlarmStatus.RESOLVED);
});

test('een opgelost en gezien alarm verdwijnt', () => {
  let state = withOpenAlarms(INITIAL_ROOM_STATE, [alarm(1n, 1000n)]);
  const seenAndResolved = alarm(1n, 1000n, AlarmStatus.RESOLVED);
  seenAndResolved.acknowledgedAtMs = 2000n;
  state = applyRoomEvent(state, { case: 'alarm', value: seenAndResolved });

  expect(state.alarms).toEqual([]);
});
