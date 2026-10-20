import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { IN_MEMORY, openDatabase, type Db } from "./connection.ts";
import { DEFAULT_ROOM, seedDefaults } from "./seed.ts";
import {
  acknowledgeAlarm,
  createAlarm,
  getAlarm,
  getOpenAlarmForSensor,
  listAlarmsToShow,
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

  const resolved = resolveAlarm(db, alarm.id, RESOLVED_AT_MS);
  assert.equal(resolved?.status, "resolved");
  assert.equal(resolved?.resolved_at_ms, RESOLVED_AT_MS);
  assert.equal(resolved?.acknowledged_by, "VP");
  assert.deepEqual(listOpenAlarms(db, DEFAULT_ROOM.id), []);
  assert.equal(resolveAlarm(db, alarm.id, RESOLVED_AT_MS), undefined);
});

test("een opgelost alarm dat niemand zag kan nog als gezien gemarkeerd worden", () => {
  const alarm = createAlarm(db, tooWarmAlarm());
  resolveAlarm(db, alarm.id, RESOLVED_AT_MS);

  const acknowledged = acknowledgeAlarm(db, alarm.id, "VP", ACKNOWLEDGED_AT_MS);
  assert.equal(acknowledged?.status, "resolved");
  assert.equal(acknowledged?.acknowledged_by, "VP");
  assert.equal(acknowledged?.acknowledged_at_ms, ACKNOWLEDGED_AT_MS);
  assert.equal(acknowledgeAlarm(db, alarm.id, "HV", ACKNOWLEDGED_AT_MS), undefined);
});

test("listAlarmsToShow houdt een opgelost alarm tot iemand het zag", () => {
  const alarm = createAlarm(db, tooWarmAlarm());
  resolveAlarm(db, alarm.id, RESOLVED_AT_MS);

  assert.deepEqual(
    listAlarmsToShow(db, DEFAULT_ROOM.id).map((shown) => shown.id),
    [alarm.id],
  );
  assert.deepEqual(listOpenAlarms(db, DEFAULT_ROOM.id), []);

  acknowledgeAlarm(db, alarm.id, "VP", ACKNOWLEDGED_AT_MS);
  assert.deepEqual(listAlarmsToShow(db, DEFAULT_ROOM.id), []);
});

test("listAlarmsToShow toont een gezien alarm tot het opgelost is", () => {
  const alarm = createAlarm(db, tooWarmAlarm());
  acknowledgeAlarm(db, alarm.id, "VP", ACKNOWLEDGED_AT_MS);
  assert.equal(listAlarmsToShow(db, DEFAULT_ROOM.id).length, 1);

  resolveAlarm(db, alarm.id, RESOLVED_AT_MS);
  assert.deepEqual(listAlarmsToShow(db, DEFAULT_ROOM.id), []);
});

test("getAlarm geeft een alarm in elke status, of undefined voor een onbekend id", () => {
  const alarm = createAlarm(db, tooWarmAlarm());
  assert.deepEqual(getAlarm(db, alarm.id), alarm);

  const resolved = resolveAlarm(db, alarm.id, RESOLVED_AT_MS);
  assert.deepEqual(getAlarm(db, alarm.id), resolved);

  assert.equal(getAlarm(db, 999), undefined);
});

test("getOpenAlarmForSensor vindt alleen open alarmen van die sensor", () => {
  const alarm = createAlarm(db, tooWarmAlarm());

  assert.equal(getOpenAlarmForSensor(db, DEFAULT_ROOM.id, "temperature")?.id, alarm.id);
  assert.equal(getOpenAlarmForSensor(db, DEFAULT_ROOM.id, "humidity"), undefined);

  resolveAlarm(db, alarm.id, RESOLVED_AT_MS);
  assert.equal(getOpenAlarmForSensor(db, DEFAULT_ROOM.id, "temperature"), undefined);
});
