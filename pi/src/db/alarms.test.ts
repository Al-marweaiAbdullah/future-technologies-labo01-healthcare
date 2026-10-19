import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { IN_MEMORY, openDatabase, type Db } from "./connection.ts";
import { DEFAULT_ROOM, seedDefaults } from "./seed.ts";
import {
  acknowledgeAlarm,
  createAlarm,
  getOpenAlarmForSensor,
  listOpenAlarms,
  resolveAlarm,
} from "./alarms.ts";
import type { NewAlarm } from "./types.ts";

const STARTED_AT_MS = 1000;
const ACKNOWLEDGED_AT_MS = 2000;
const RESOLVED_AT_MS = 3000;

function tooWarmAlarm(): NewAlarm {
  return {
    room_id: DEFAULT_ROOM.id,
    sensor: "temperature",
    value: 27.4,
    reason: "Te warm: 27,4 °C",
    started_at_ms: STARTED_AT_MS,
  };
}

let db: Db;
beforeEach(() => {
  db = openDatabase(IN_MEMORY);
  seedDefaults(db);
});

test("createAlarm maakt een actief alarm met standaard 60 s tot de buzzer", () => {
  const alarm = createAlarm(db, tooWarmAlarm());
  assert.equal(alarm.status, "active");
  assert.equal(alarm.buzzer_after_sec, 60);
  assert.equal(alarm.acknowledged_at_ms, null);
});

test("createAlarm neemt een eigen buzzertijd over", () => {
  const alarm = createAlarm(db, { ...tooWarmAlarm(), buzzer_after_sec: 10 });
  assert.equal(alarm.buzzer_after_sec, 10);
});

test("acknowledgeAlarm zet een actief alarm op bevestigd", () => {
  const alarm = createAlarm(db, tooWarmAlarm());

  const acknowledged = acknowledgeAlarm(db, alarm.id, "VP", ACKNOWLEDGED_AT_MS);
  assert.equal(acknowledged?.status, "acknowledged");
  assert.equal(acknowledged?.acknowledged_by, "VP");
  assert.equal(acknowledged?.acknowledged_at_ms, ACKNOWLEDGED_AT_MS);
  assert.deepEqual(listOpenAlarms(db, DEFAULT_ROOM.id), [acknowledged]);
});

test("acknowledgeAlarm geeft undefined voor een al bevestigd of onbekend alarm", () => {
  const alarm = createAlarm(db, tooWarmAlarm());
  acknowledgeAlarm(db, alarm.id, "VP", ACKNOWLEDGED_AT_MS);

  assert.equal(acknowledgeAlarm(db, alarm.id, "VP", ACKNOWLEDGED_AT_MS), undefined);
  assert.equal(acknowledgeAlarm(db, 999, "VP", ACKNOWLEDGED_AT_MS), undefined);
});

test("resolveAlarm sluit een open alarm af", () => {
  const alarm = createAlarm(db, tooWarmAlarm());
  acknowledgeAlarm(db, alarm.id, "VP", ACKNOWLEDGED_AT_MS);

  assert.equal(resolveAlarm(db, alarm.id, RESOLVED_AT_MS), true);
  assert.deepEqual(listOpenAlarms(db, DEFAULT_ROOM.id), []);
  assert.equal(resolveAlarm(db, alarm.id, RESOLVED_AT_MS), false);
});

test("een opgelost alarm kan niet meer bevestigd worden", () => {
  const alarm = createAlarm(db, tooWarmAlarm());
  resolveAlarm(db, alarm.id, RESOLVED_AT_MS);

  assert.equal(acknowledgeAlarm(db, alarm.id, "VP", ACKNOWLEDGED_AT_MS), undefined);
});

test("getOpenAlarmForSensor vindt alleen open alarmen van die sensor", () => {
  const alarm = createAlarm(db, tooWarmAlarm());

  assert.equal(getOpenAlarmForSensor(db, DEFAULT_ROOM.id, "temperature")?.id, alarm.id);
  assert.equal(getOpenAlarmForSensor(db, DEFAULT_ROOM.id, "sound"), undefined);

  resolveAlarm(db, alarm.id, RESOLVED_AT_MS);
  assert.equal(getOpenAlarmForSensor(db, DEFAULT_ROOM.id, "temperature"), undefined);
});
