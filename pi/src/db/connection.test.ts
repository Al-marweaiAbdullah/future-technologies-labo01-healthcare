import assert from "node:assert/strict";
import { test } from "node:test";
import { IN_MEMORY, openDatabase } from "./connection.ts";
import { runMigrations } from "./migrate.ts";

test("openDatabase voert de migraties uit", () => {
  const db = openDatabase(IN_MEMORY);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .pluck()
    .all();

  assert.deepEqual([...tables].sort(), ["alarms", "measurements", "rooms", "thresholds"]);
  assert.equal(db.pragma("user_version", { simple: true }), 1);
});

test("openDatabase zet foreign keys aan", () => {
  const db = openDatabase(IN_MEMORY);
  assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
});

test("migraties opnieuw uitvoeren doet niets", () => {
  const db = openDatabase(IN_MEMORY);
  assert.doesNotThrow(() => runMigrations(db));
  assert.equal(db.pragma("user_version", { simple: true }), 1);
});
