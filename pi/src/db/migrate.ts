import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./connection.ts";

const MIGRATIONS_DIR = join(import.meta.dirname, "migrations");
const MIGRATION_FILE_PATTERN = /^(\d{3})_.+\.sql$/;

type Migration = { version: number; file: string };

function findMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .map((file) => {
      const match = MIGRATION_FILE_PATTERN.exec(file);
      return match?.[1] ? { version: Number(match[1]), file } : null;
    })
    .filter((migration) => migration !== null)
    .sort((a, b) => a.version - b.version);
}

// PRAGMA user_version onthoudt de laatst uitgevoerde migratie, zo draait elke migratie maar één keer.
export function runMigrations(db: Db): void {
  const currentVersion = db.pragma("user_version", { simple: true }) as number;

  for (const migration of findMigrations()) {
    if (migration.version <= currentVersion) continue;

    const sql = readFileSync(join(MIGRATIONS_DIR, migration.file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${migration.version}`);
    })();
  }
}
