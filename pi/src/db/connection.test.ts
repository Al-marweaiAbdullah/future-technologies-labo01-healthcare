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
  assert.equal(db.pragma("user_version", { simple: true }), 2);
});

test("openDatabase zet foreign keys aan", () => {
  const db = openDatabase(IN_MEMORY);
  assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
});

test("migraties opnieuw uitvoeren doet niets", () => {
  const db = openDatabase(IN_MEMORY);
  assert.doesNotThrow(() => runMigrations(db));
  assert.equal(db.pragma("user_version", { simple: true }), 2);
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
