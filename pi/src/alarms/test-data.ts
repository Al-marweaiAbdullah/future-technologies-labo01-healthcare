// Verzonnen testdata voor de alarmtests, geen echte metingen.
import type { AlarmRow, NewMeasurement, ThresholdRow } from "../db/index.ts";

export const ROOM_ID = "room1";

export const THRESHOLDS: ThresholdRow[] = [
  { room_id: ROOM_ID, sensor: "temperature", min_value: 18, max_value: 24, max_duration_sec: null },
  { room_id: ROOM_ID, sensor: "humidity", min_value: 30, max_value: 60, max_duration_sec: null },
  { room_id: ROOM_ID, sensor: "light", min_value: null, max_value: 700, max_duration_sec: 60 },
];

// Een meting waarbij alles binnen de drempels valt.
export function normalMeasurement(overrides: Partial<NewMeasurement> = {}): NewMeasurement {
  return {
    room_id: ROOM_ID,
    timestamp_ms: 0,
    temperature_c: 21,
    humidity_percent: 45,
    light_raw: 300,
    motion: 0,
    ...overrides,
  };
}

export function alarm(overrides: Partial<AlarmRow> = {}): AlarmRow {
  return {
    id: 1,
    room_id: ROOM_ID,
    sensor: "temperature",
    value: 27.4,
    reason: "Te warm: 27,4 °C",
    started_at_ms: 0,
    buzzer_after_sec: 60,
    status: "active",
    acknowledged_at_ms: null,
    acknowledged_by: null,
    resolved_at_ms: null,
    ...overrides,
  };
}
