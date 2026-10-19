import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateMeasurement } from "./evaluate.ts";
import { alarm, normalMeasurement, ROOM_ID, THRESHOLDS } from "./test-data.ts";

const NOW_MS = 100_000;
const SEC = 1000;

test("alles binnen de drempels: geen alarmen", () => {
  const result = evaluateMeasurement({
    measurement: normalMeasurement(),
    thresholds: THRESHOLDS,
    openAlarms: [],
    exceededSince: new Map(),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result, { alarmsToCreate: [], alarmIdsToResolve: [], exceededSince: new Map() });
});

test("te warm zonder open alarm: meteen een nieuw alarm", () => {
  const result = evaluateMeasurement({
    measurement: normalMeasurement({ temperature_c: 27.4 }),
    thresholds: THRESHOLDS,
    openAlarms: [],
    exceededSince: new Map(),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, [
    {
      room_id: ROOM_ID,
      sensor: "temperature",
      value: 27.4,
      reason: "Te warm: 27,4 °C",
      started_at_ms: NOW_MS,
    },
  ]);
});

test("te warm met al een open alarm: geen tweede alarm", () => {
  const result = evaluateMeasurement({
    measurement: normalMeasurement({ temperature_c: 28 }),
    thresholds: THRESHOLDS,
    openAlarms: [alarm({ sensor: "temperature" })],
    exceededSince: new Map(),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, []);
  assert.deepEqual(result.alarmIdsToResolve, []);
});

test("waarde weer normaal: open alarm wordt opgelost, ook als het bevestigd was", () => {
  const result = evaluateMeasurement({
    measurement: normalMeasurement(),
    thresholds: THRESHOLDS,
    openAlarms: [alarm({ id: 7, sensor: "temperature", status: "acknowledged" })],
    exceededSince: new Map([["temperature", NOW_MS - 30 * SEC]]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmIdsToResolve, [7]);
  assert.deepEqual(result.exceededSince, new Map());
});

test("licht 59 s boven de drempel: nog geen alarm", () => {
  const result = evaluateMeasurement({
    measurement: normalMeasurement({ light_raw: 800 }),
    thresholds: THRESHOLDS,
    openAlarms: [],
    exceededSince: new Map([["light", NOW_MS - 59 * SEC]]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, []);
  assert.equal(result.exceededSince.get("light"), NOW_MS - 59 * SEC);
});

test("licht 61 s boven de drempel: alarm", () => {
  const result = evaluateMeasurement({
    measurement: normalMeasurement({ light_raw: 800 }),
    thresholds: THRESHOLDS,
    openAlarms: [],
    exceededSince: new Map([["light", NOW_MS - 61 * SEC]]),
    nowMs: NOW_MS,
  });

  assert.equal(result.alarmsToCreate.length, 1);
  assert.equal(result.alarmsToCreate[0]?.reason, "Licht te lang aan: 800");
});

test("eerste meting boven de drempel start de teller", () => {
  const result = evaluateMeasurement({
    measurement: normalMeasurement({ light_raw: 800 }),
    thresholds: THRESHOLDS,
    openAlarms: [],
    exceededSince: new Map(),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, []);
  assert.deepEqual(result.exceededSince, new Map([["light", NOW_MS]]));
});

test("korte geluidspiek: geen alarm, de teller stopt als het weer stil is", () => {
  const peak = evaluateMeasurement({
    measurement: normalMeasurement({ sound_raw: 900 }),
    thresholds: THRESHOLDS,
    openAlarms: [],
    exceededSince: new Map(),
    nowMs: NOW_MS,
  });
  const quiet = evaluateMeasurement({
    measurement: normalMeasurement(),
    thresholds: THRESHOLDS,
    openAlarms: [],
    exceededSince: peak.exceededSince,
    nowMs: NOW_MS + 2 * SEC,
  });

  assert.deepEqual(peak.alarmsToCreate, []);
  assert.deepEqual(quiet.alarmsToCreate, []);
  assert.deepEqual(quiet.exceededSince, new Map());
});

test("sensor zonder waarde: niets veranderen", () => {
  const result = evaluateMeasurement({
    measurement: normalMeasurement({ temperature_c: null }),
    thresholds: THRESHOLDS,
    openAlarms: [alarm({ sensor: "temperature" })],
    exceededSince: new Map([["temperature", NOW_MS - 10 * SEC]]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmIdsToResolve, []);
  assert.deepEqual(result.exceededSince, new Map([["temperature", NOW_MS - 10 * SEC]]));
});

test("beweging geeft nooit een alarm, ook niet met een drempel", () => {
  const result = evaluateMeasurement({
    measurement: normalMeasurement({ motion: 1 }),
    thresholds: [
      { room_id: ROOM_ID, sensor: "motion", min_value: null, max_value: 0, max_duration_sec: null },
    ],
    openAlarms: [],
    exceededSince: new Map(),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, []);
});

test("de doorgegeven exceededSince wordt niet aangepast", () => {
  const exceededSince = new Map([["light" as const, NOW_MS - 10 * SEC]]);
  evaluateMeasurement({
    measurement: normalMeasurement(),
    thresholds: THRESHOLDS,
    openAlarms: [],
    exceededSince,
    nowMs: NOW_MS,
  });

  assert.deepEqual(exceededSince, new Map([["light", NOW_MS - 10 * SEC]]));
});
