import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { IN_MEMORY, openDatabase, type Db } from "./connection.ts";
import { DEFAULT_ROOM, seedDefaults } from "./seed.ts";
import { getLatestMeasurement, listMeasurements, saveMeasurement } from "./measurements.ts";
import type { NewMeasurement } from "./types.ts";

// Verzonnen testdata, geen echte metingen.
function fakeMeasurement(timestampMs: number): NewMeasurement {
  return {
    room_id: DEFAULT_ROOM.id,
    timestamp_ms: timestampMs,
    temperature_c: 21.5,
    humidity_percent: 45,
    light_raw: 300,
    motion: 0,
  };
}

let db: Db;
beforeEach(() => {
  db = openDatabase(IN_MEMORY);
  seedDefaults(db);
});

test("saveMeasurement geeft de opgeslagen rij met id terug", () => {
  const saved = saveMeasurement(db, fakeMeasurement(1000));
  assert.equal(saved.id, 1);
  assert.equal(saved.temperature_c, 21.5);
});

test("getLatestMeasurement geeft de meest recente meting", () => {
  saveMeasurement(db, fakeMeasurement(1000));
  saveMeasurement(db, fakeMeasurement(3000));
  saveMeasurement(db, fakeMeasurement(2000));

  assert.equal(getLatestMeasurement(db, DEFAULT_ROOM.id)?.timestamp_ms, 3000);
});

test("getLatestMeasurement geeft undefined zonder metingen", () => {
  assert.equal(getLatestMeasurement(db, DEFAULT_ROOM.id), undefined);
});

test("listMeasurements geeft metingen binnen de periode, oudste eerst", () => {
  for (const timestampMs of [3000, 1000, 2000, 4000]) {
    saveMeasurement(db, fakeMeasurement(timestampMs));
  }

  const times = listMeasurements(db, DEFAULT_ROOM.id, 2000, 3000).map((m) => m.timestamp_ms);
  assert.deepEqual(times, [2000, 3000]);
});

test("saveMeasurement weigert een onbekende kamer", () => {
  assert.throws(
    () => saveMeasurement(db, { ...fakeMeasurement(1000), room_id: "unknown" }),
    /FOREIGN KEY/,
  );
});
