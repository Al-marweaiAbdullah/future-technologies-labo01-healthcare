import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { IN_MEMORY, openDatabase } from "./connection.ts";
import { runMigrations } from "./migrate.ts";

test("openDatabase voert de migraties uit", () => {
  const db = openDatabase(IN_MEMORY);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .pluck()
    .all();

  assert.deepEqual([...tables].sort(), ["alarms", "measurements", "rooms", "thresholds"]);
  assert.equal(db.pragma("user_version", { simple: true }), 3);
});

test("openDatabase zet foreign keys aan", () => {
  const db = openDatabase(IN_MEMORY);
  assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
});

test("migraties opnieuw uitvoeren doet niets", () => {
  const db = openDatabase(IN_MEMORY);
  assert.doesNotThrow(() => runMigrations(db));
  assert.equal(db.pragma("user_version", { simple: true }), 3);
});

test("migratie 002 haalt geluid weg en houdt de rest", () => {
  // Een database zoals ze was na 001, met verzonnen geluidsgegevens erin.
  const db = new Database(IN_MEMORY);
  db.exec(readFileSync(join(import.meta.dirname, "migrations", "001_init.sql"), "utf8"));
  db.pragma("user_version = 1");
  db.exec(`
    INSERT INTO rooms (id, name) VALUES ('room1', 'Kamer 1');
    INSERT INTO measurements (room_id, timestamp_ms, light_raw, sound_raw) VALUES ('room1', 1, 300, 200);
    INSERT INTO thresholds (room_id, sensor, max_value) VALUES ('room1', 'sound', 600), ('room1', 'light', 900);
    INSERT INTO alarms (room_id, sensor, reason, started_at_ms) VALUES
      ('room1', 'sound', 'Te luid: 650', 1), ('room1', 'light', 'Licht te lang aan: 950', 2);
  `);

  runMigrations(db);

  const measurementColumns = db
    .prepare("SELECT name FROM pragma_table_info('measurements')")
    .pluck()
    .all();
  assert.ok(!measurementColumns.includes("sound_raw"));
  assert.deepEqual(db.prepare("SELECT light_raw FROM measurements").pluck().all(), [300]);
  assert.deepEqual(db.prepare("SELECT sensor FROM thresholds").pluck().all(), ["light"]);
  assert.deepEqual(db.prepare("SELECT sensor FROM alarms").pluck().all(), ["light"]);
  assert.throws(
    () => db.prepare("INSERT INTO thresholds (room_id, sensor) VALUES ('room1', 'sound')").run(),
    /CHECK constraint failed/,
  );
});

test("migratie 003 geeft licht in een bestaande database het nachtvenster 22 tot 7", () => {
  // Een database zoals ze was na 002, met verzonnen drempels erin.
  const db = new Database(IN_MEMORY);
  for (const file of ["001_init.sql", "002_remove_sound.sql"]) {
    db.exec(readFileSync(join(import.meta.dirname, "migrations", file), "utf8"));
  }
  db.pragma("user_version = 2");
  db.exec(`
    INSERT INTO rooms (id, name) VALUES ('room1', 'Kamer 1');
    INSERT INTO thresholds (room_id, sensor, max_value) VALUES ('room1', 'light', 900), ('room1', 'temperature', 24);
  `);

  runMigrations(db);

  const hours = db
    .prepare("SELECT sensor, active_from_hour, active_to_hour FROM thresholds ORDER BY sensor")
    .all();
  assert.deepEqual(hours, [
    { sensor: "light", active_from_hour: 22, active_to_hour: 7 },
    { sensor: "temperature", active_from_hour: null, active_to_hour: null },
  ]);
  assert.throws(
    () => db.prepare("UPDATE thresholds SET active_from_hour = 24 WHERE sensor = 'light'").run(),
    /CHECK constraint failed/,
  );
});
