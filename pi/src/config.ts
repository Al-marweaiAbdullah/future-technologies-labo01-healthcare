// Centrale configuratie van KamerWacht. Waarden zijn te overschrijven met omgevingsvariabelen.
import { join } from "node:path";

const DEFAULT_DB_PATH = join(import.meta.dirname, "..", "data", "kamerwacht.db");

export const DB_PATH = process.env["KAMERWACHT_DB_PATH"] ?? DEFAULT_DB_PATH;
