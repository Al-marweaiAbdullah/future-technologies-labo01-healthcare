// Start alleen de gRPC-server met nepdata, zonder sensoren en met een database in het geheugen.
// Uitvoeren met: npm run dev:fake
import { GRPC_PORT } from "../config.ts";
import { DEFAULT_ROOM, IN_MEMORY, openDatabase, seedDefaults } from "../db/index.ts";
import { startFakeData } from "./fake-data.ts";
import { startGrpcServer } from "./server.ts";

const FAKE_INTERVAL_MS = 1000;

const db = openDatabase(IN_MEMORY);
seedDefaults(db);
startGrpcServer(db, GRPC_PORT);
startFakeData(db, DEFAULT_ROOM.id, FAKE_INTERVAL_MS);

console.log(`Nepdata voor kamer "${DEFAULT_ROOM.id}", elke ${FAKE_INTERVAL_MS} ms`);
