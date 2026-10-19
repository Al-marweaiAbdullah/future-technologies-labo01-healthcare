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
  assert.deepEqual(sensors, ["humidity", "light", "sound", "temperature"]);
});

test("seedDefaults twee keer uitvoeren maakt geen dubbels", () => {
  const db = openDatabase(IN_MEMORY);
  seedDefaults(db);
  seedDefaults(db);

  assert.equal(listRooms(db).length, 1);
  assert.equal(listThresholds(db, DEFAULT_ROOM.id).length, 4);
});
