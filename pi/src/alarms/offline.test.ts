import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateSensorHealth, OFFLINE_AFTER_SEC } from "./offline.ts";
import { alarm, normalMeasurement, ROOM_ID } from "./test-data.ts";

const SEC = 1000;
const OFFLINE_AFTER_MS = OFFLINE_AFTER_SEC * SEC;
const NOW_MS = 1_000_000;

// Een alarm dat alarms/offline.ts zelf gemaakt heeft: een sensor zonder waarde, dus value = null.
const offlineAlarm = alarm({
  id: 7,
  sensor: "temperature",
  value: null,
  reason: "Temperatuursensor geeft geen waarde",
});

test("alle sensoren geven een waarde: niets te doen", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement(),
    openAlarms: [],
    missingSince: new Map(),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result, { alarmsToCreate: [], alarmIdsToResolve: [], missingSince: new Map() });
});

test("eerste meting zonder waarde: tijd onthouden, nog geen alarm", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement({ temperature_c: null }),
    openAlarms: [],
    missingSince: new Map(),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, []);
  assert.deepEqual(result.missingSince, new Map([["temperature", NOW_MS]]));
});

test("net niet lang genoeg zonder waarde: nog geen alarm, tijd blijft die van het begin", () => {
  const startedMs = NOW_MS - OFFLINE_AFTER_MS;
  const result = evaluateSensorHealth({
    measurement: normalMeasurement({ temperature_c: null }),
    openAlarms: [],
    missingSince: new Map([["temperature", startedMs]]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, []);
  assert.deepEqual(result.missingSince, new Map([["temperature", startedMs]]));
});

test("langer dan de grens zonder waarde: een alarm zonder waarde", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement({ temperature_c: null }),
    openAlarms: [],
    missingSince: new Map([["temperature", NOW_MS - OFFLINE_AFTER_MS - 1]]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, [
    {
      room_id: ROOM_ID,
      sensor: "temperature",
      value: null,
      reason: "Temperatuursensor geeft geen waarde",
      started_at_ms: NOW_MS,
    },
  ]);
});

test("al een offline-alarm open voor die sensor: geen tweede", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement({ temperature_c: null }),
    openAlarms: [offlineAlarm],
    missingSince: new Map([["temperature", NOW_MS - 10 * OFFLINE_AFTER_MS]]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, []);
  assert.deepEqual(result.alarmIdsToResolve, []);
});

test("een bevestigd offline-alarm telt ook als open: geen tweede", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement({ temperature_c: null }),
    openAlarms: [{ ...offlineAlarm, status: "acknowledged" }],
    missingSince: new Map([["temperature", NOW_MS - 10 * OFFLINE_AFTER_MS]]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, []);
});

test("er staat al een drempelalarm open voor die sensor: geen offline-alarm erbovenop", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement({ temperature_c: null }),
    openAlarms: [alarm({ sensor: "temperature", value: 27.4 })],
    missingSince: new Map([["temperature", NOW_MS - 10 * OFFLINE_AFTER_MS]]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmsToCreate, []);
});

test("sensor geeft weer een waarde: tijd gewist en het offline-alarm opgelost", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement(),
    openAlarms: [offlineAlarm],
    missingSince: new Map([["temperature", NOW_MS - 10 * OFFLINE_AFTER_MS]]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmIdsToResolve, [offlineAlarm.id]);
  assert.deepEqual(result.missingSince, new Map());
});

test("sensor geeft weer een waarde: een drempelalarm blijft aan evaluateMeasurement", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement({ temperature_c: 27.4 }),
    openAlarms: [alarm({ sensor: "temperature", value: 27.1 })],
    missingSince: new Map(),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.alarmIdsToResolve, []);
});

test("een sensor die even wegviel en terugkomt, begint opnieuw te tellen", () => {
  const back = evaluateSensorHealth({
    measurement: normalMeasurement(),
    openAlarms: [],
    missingSince: new Map([["temperature", NOW_MS - OFFLINE_AFTER_MS + SEC]]),
    nowMs: NOW_MS,
  });
  const gone = evaluateSensorHealth({
    measurement: normalMeasurement({ temperature_c: null }),
    openAlarms: [],
    missingSince: back.missingSince,
    nowMs: NOW_MS + SEC,
  });

  assert.deepEqual(gone.alarmsToCreate, []);
  assert.deepEqual(gone.missingSince, new Map([["temperature", NOW_MS + SEC]]));
});

test("de DHT22 valt uit: temperatuur en luchtvochtigheid krijgen elk een alarm", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement({ temperature_c: null, humidity_percent: null }),
    openAlarms: [],
    missingSince: new Map([
      ["temperature", NOW_MS - 2 * OFFLINE_AFTER_MS],
      ["humidity", NOW_MS - 2 * OFFLINE_AFTER_MS],
    ]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(
    result.alarmsToCreate.map((created) => [created.sensor, created.reason]),
    [
      ["temperature", "Temperatuursensor geeft geen waarde"],
      ["humidity", "Luchtvochtigheidssensor geeft geen waarde"],
    ],
  );
});

test("lichtsensor en bewegingssensor worden ook bewaakt", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement({ light_raw: null, motion: null }),
    openAlarms: [],
    missingSince: new Map([
      ["light", NOW_MS - 2 * OFFLINE_AFTER_MS],
      ["motion", NOW_MS - 2 * OFFLINE_AFTER_MS],
    ]),
    nowMs: NOW_MS,
  });

  assert.deepEqual(
    result.alarmsToCreate.map((created) => [created.sensor, created.reason]),
    [
      ["light", "Lichtsensor geeft geen waarde"],
      ["motion", "Bewegingssensor geeft geen waarde"],
    ],
  );
});

test("beweging 0 (geen beweging) is een waarde, geen uitval", () => {
  const result = evaluateSensorHealth({
    measurement: normalMeasurement({ motion: 0 }),
    openAlarms: [],
    missingSince: new Map(),
    nowMs: NOW_MS,
  });

  assert.deepEqual(result.missingSince, new Map());
});

test("de meegegeven missingSince wordt niet aangepast", () => {
  const missingSince = new Map([["temperature" as const, NOW_MS - 10 * OFFLINE_AFTER_MS]]);
  evaluateSensorHealth({
    measurement: normalMeasurement(),
    openAlarms: [],
    missingSince,
    nowMs: NOW_MS,
  });

  assert.deepEqual(missingSince, new Map([["temperature", NOW_MS - 10 * OFFLINE_AFTER_MS]]));
});
