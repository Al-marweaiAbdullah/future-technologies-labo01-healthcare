import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { runMigrations } from "./migrate.ts";

export type Db = Database.Database;

export const IN_MEMORY = ":memory:";

// Opent de database, zet de vaste instellingen aan en brengt het schema up-to-date.
export function openDatabase(path: string): Db {
  if (path !== IN_MEMORY) mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma("journal_mode = WAL"); // lezen en schrijven blokkeren elkaar niet
  db.pragma("foreign_keys = ON"); // staat in SQLite standaard uit, per verbinding
  runMigrations(db);
  return db;
}
