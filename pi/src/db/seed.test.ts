import assert from "node:assert/strict";
import { test } from "node:test";
import { IN_MEMORY, openDatabase } from "./connection.ts";
import { DEFAULT_ROOM, seedDefaults } from "./seed.ts";
import { listRooms } from "./rooms.ts";
import { listThresholds } from "./thresholds.ts";

test("seedDefaults maakt de standaardkamer met drempels aan", () => {
  const db = openDatabase(IN_MEMORY);
  seedDefaults(db);

  assert.deepEqual(listRooms(db), [DEFAULT_ROOM]);
  const sensors = listThresholds(db, DEFAULT_ROOM.id).map((threshold) => threshold.sensor);
  assert.deepEqual(sensors, ["humidity", "light", "temperature"]);
});

test("seedDefaults twee keer uitvoeren maakt geen dubbels", () => {
  const db = openDatabase(IN_MEMORY);
  seedDefaults(db);
  seedDefaults(db);

  assert.equal(listRooms(db).length, 1);
  assert.equal(listThresholds(db, DEFAULT_ROOM.id).length, 3);
});

test("seedDefaults: licht geldt alleen 's nachts, de andere drempels altijd", () => {
  const db = openDatabase(IN_MEMORY);
  seedDefaults(db);

  const hours = listThresholds(db, DEFAULT_ROOM.id).map(
    ({ sensor, active_from_hour, active_to_hour }) => ({
      sensor,
      active_from_hour,
      active_to_hour,
    }),
  );
  assert.deepEqual(hours, [
    { sensor: "humidity", active_from_hour: null, active_to_hour: null },
    { sensor: "light", active_from_hour: 22, active_to_hour: 7 },
    { sensor: "temperature", active_from_hour: null, active_to_hour: null },
  ]);
});
