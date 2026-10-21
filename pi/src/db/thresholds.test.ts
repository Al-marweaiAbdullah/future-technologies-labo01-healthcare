import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { IN_MEMORY, openDatabase, type Db } from "./connection.ts";
import { DEFAULT_ROOM, seedDefaults } from "./seed.ts";
import { listThresholds, updateThreshold } from "./thresholds.ts";

let db: Db;
beforeEach(() => {
  db = openDatabase(IN_MEMORY);
  seedDefaults(db);
});

test("updateThreshold past een drempel aan en geeft ze terug", () => {
  const updated = updateThreshold(db, DEFAULT_ROOM.id, "temperature", {
    min_value: 19,
    max_value: 23,
    max_duration_sec: 30,
  });

  assert.deepEqual(updated, {
    room_id: DEFAULT_ROOM.id,
    sensor: "temperature",
    min_value: 19,
    max_value: 23,
    max_duration_sec: 30,
    active_from_hour: null,
    active_to_hour: null,
  });
  const stored = listThresholds(db, DEFAULT_ROOM.id).find((t) => t.sensor === "temperature");
  assert.deepEqual(stored, updated);
});

test("updateThreshold laat de andere drempels ongemoeid", () => {
  const before = listThresholds(db, DEFAULT_ROOM.id).filter((t) => t.sensor !== "humidity");
  updateThreshold(db, DEFAULT_ROOM.id, "humidity", {
    min_value: 35,
    max_value: 55,
    max_duration_sec: null,
  });

  const after = listThresholds(db, DEFAULT_ROOM.id).filter((t) => t.sensor !== "humidity");
  assert.deepEqual(after, before);
});

test("updateThreshold met null schakelt een grens uit", () => {
  const updated = updateThreshold(db, DEFAULT_ROOM.id, "temperature", {
    min_value: null,
    max_value: 26,
    max_duration_sec: null,
  });
  assert.equal(updated?.min_value, null);
});

test("updateThreshold geeft undefined voor een onbekende kamer of sensor zonder drempel", () => {
  const values = { min_value: null, max_value: 1, max_duration_sec: null };
  assert.equal(updateThreshold(db, "unknown", "temperature", values), undefined);
  assert.equal(updateThreshold(db, DEFAULT_ROOM.id, "motion", values), undefined);
});

test("updateThreshold weigert ongeldige waarden en verandert dan niets", () => {
  const before = listThresholds(db, DEFAULT_ROOM.id);

  assert.throws(
    () =>
      updateThreshold(db, DEFAULT_ROOM.id, "temperature", {
        min_value: 25,
        max_value: 20,
        max_duration_sec: null,
      }),
    RangeError,
  );
  assert.throws(
    () =>
      updateThreshold(db, DEFAULT_ROOM.id, "light", {
        min_value: null,
        max_value: 900,
        max_duration_sec: -1,
      }),
    RangeError,
  );
  assert.throws(
    () =>
      updateThreshold(db, DEFAULT_ROOM.id, "humidity", {
        min_value: Number.NaN,
        max_value: 60,
        max_duration_sec: null,
      }),
    RangeError,
  );

  assert.deepEqual(listThresholds(db, DEFAULT_ROOM.id), before);
});

test("updateThreshold zet en wist de actieve uren", () => {
  const night = updateThreshold(db, DEFAULT_ROOM.id, "temperature", {
    min_value: 18,
    max_value: 24,
    max_duration_sec: null,
    active_from_hour: 23,
    active_to_hour: 6,
  });
  assert.equal(night?.active_from_hour, 23);
  assert.equal(night?.active_to_hour, 6);

  const always = updateThreshold(db, DEFAULT_ROOM.id, "temperature", {
    min_value: 18,
    max_value: 24,
    max_duration_sec: null,
    active_from_hour: null,
    active_to_hour: null,
  });
  assert.equal(always?.active_from_hour, null);
  assert.equal(always?.active_to_hour, null);
});

test("updateThreshold zonder actieve uren laat de bestaande uren staan", () => {
  // Zo wist een client die de uren nog niet kent het nachtvenster van licht niet.
  const updated = updateThreshold(db, DEFAULT_ROOM.id, "light", {
    min_value: null,
    max_value: 950,
    max_duration_sec: 600,
  });
  assert.equal(updated?.max_value, 950);
  assert.equal(updated?.active_from_hour, 22);
  assert.equal(updated?.active_to_hour, 7);
});

test("updateThreshold weigert ongeldige actieve uren", () => {
  const base = { min_value: null, max_value: 900, max_duration_sec: 60 };
  for (const hours of [
    { active_from_hour: 22, active_to_hour: null },
    { active_from_hour: 24, active_to_hour: 7 },
    { active_from_hour: 22.5, active_to_hour: 7 },
    { active_from_hour: 7, active_to_hour: 7 },
  ]) {
    assert.throws(
      () => updateThreshold(db, DEFAULT_ROOM.id, "light", { ...base, ...hours }),
      RangeError,
    );
  }
});
