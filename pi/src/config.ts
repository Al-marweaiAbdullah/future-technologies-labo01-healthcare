// Centrale configuratie van RestWell. Waarden zijn te overschrijven met omgevingsvariabelen.
import { join } from "node:path";

const DEFAULT_DB_PATH = join(import.meta.dirname, "..", "data", "restwell.db");

export const DB_PATH = process.env["RESTWELL_DB_PATH"] ?? DEFAULT_DB_PATH;

const DEFAULT_GRPC_PORT = 8080;

// De app praat met de Pi op deze poort. De server luistert op alle netwerkadressen.
export const GRPC_PORT = Number(process.env["RESTWELL_GRPC_PORT"] ?? DEFAULT_GRPC_PORT);
