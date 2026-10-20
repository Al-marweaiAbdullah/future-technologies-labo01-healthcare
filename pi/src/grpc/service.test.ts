import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  Code,
  ConnectError,
  createClient,
  createRouterTransport,
  type Client,
} from "@connectrpc/connect";
import {
  DEFAULT_ROOM,
  IN_MEMORY,
  createAlarm,
  openDatabase,
  saveMeasurement,
  seedDefaults,
  type Db,
  type NewMeasurement,
} from "../db/index.ts";
import { AlarmStatus, Metric, RestWellService } from "./generated/restwell/v1/restwell_pb.js";
import { publishMeasurement } from "./events.ts";
import { createRestWellService } from "./service.ts";

// Verzonnen testdata, geen echte metingen.
function fakeMeasurement(
  timestampMs: number,
  overrides: Partial<NewMeasurement> = {},
): NewMeasurement {
  return {
    room_id: DEFAULT_ROOM.id,
    timestamp_ms: timestampMs,
    temperature_c: 21.5,
    humidity_percent: 45,
    light_raw: 300,
    sound_raw: 200,
    motion: 0,
    ...overrides,
  };
}

let db: Db;
let client: Client<typeof RestWellService>;
beforeEach(() => {
  db = openDatabase(IN_MEMORY);
  seedDefaults(db);
  // Praat met de service in het geheugen, zonder netwerk.
  const transport = createRouterTransport((router) => {
    router.service(
      RestWellService,
      createRestWellService(db, () => {}),
    );
  });
  client = createClient(RestWellService, transport);
});

async function assertConnectCode(promise: Promise<unknown>, code: Code): Promise<void> {
  await assert.rejects(promise, (error) => ConnectError.from(error).code === code);
}

test("ListRooms geeft de kamers uit de database", async () => {
  const { rooms } = await client.listRooms({});
  assert.deepEqual(
    rooms.map((room) => ({ id: room.id, name: room.name })),
    [DEFAULT_ROOM],
  );
});

test("ListReadings geeft metingen vanaf since_ms, oudste eerst", async () => {
  for (const timestampMs of [3000, 1000, 2000]) saveMeasurement(db, fakeMeasurement(timestampMs));

  const { readings } = await client.listReadings({ roomId: DEFAULT_ROOM.id, sinceMs: 2000n });
  assert.deepEqual(
    readings.map((reading) => reading.timestampMs),
    [2000n, 3000n],
  );
});

test("ListReadings laat een ontbrekende meetwaarde leeg in plaats van 0", async () => {
  saveMeasurement(db, fakeMeasurement(1000, { temperature_c: null, motion: null }));

  const [reading] = (await client.listReadings({ roomId: DEFAULT_ROOM.id, sinceMs: 0n })).readings;
  assert.equal(reading?.temperatureC, undefined);
  assert.equal(reading?.motionDetected, undefined);
  assert.equal(reading?.humidityPercent, 45);
});

test("ListOpenAlarms zet sensor en status om naar de enums van het contract", async () => {
  createAlarm(db, {
    room_id: DEFAULT_ROOM.id,
    sensor: "temperature",
    value: 26,
    reason: "Temperatuur te hoog",
    started_at_ms: 1000,
  });

  const [alarm] = (await client.listOpenAlarms({ roomId: DEFAULT_ROOM.id })).alarms;
  assert.equal(alarm?.metric, Metric.TEMPERATURE);
  assert.equal(alarm?.status, AlarmStatus.ACTIVE);
  assert.equal(alarm?.buzzerAfterSec, 60);
  assert.equal(alarm?.acknowledgedAtMs, undefined);
});

test("een onbekende kamer geeft NOT_FOUND", async () => {
  await assertConnectCode(client.listOpenAlarms({ roomId: "unknown" }), Code.NotFound);
  await assertConnectCode(client.listReadings({ roomId: "unknown", sinceMs: 0n }), Code.NotFound);
});

test("WatchRoom stuurt eerst de laatste meting en daarna elke nieuwe", async () => {
  saveMeasurement(db, fakeMeasurement(1000));
  const abort = new AbortController();
  const stream = client.watchRoom({ roomId: DEFAULT_ROOM.id }, { signal: abort.signal });
  const iterator = stream[Symbol.asyncIterator]();

  const first = await iterator.next();
  assert.equal(first.value?.event.case, "reading");
  assert.equal(first.value?.event.value?.timestampMs, 1000n);

  publishMeasurement(saveMeasurement(db, fakeMeasurement(2000)));
  const second = await iterator.next();
  assert.equal(second.value?.event.value?.timestampMs, 2000n);

  abort.abort();
});

test("WatchRoom stuurt geen gebeurtenissen van een andere kamer", async () => {
  const abort = new AbortController();
  const stream = client.watchRoom({ roomId: DEFAULT_ROOM.id }, { signal: abort.signal });
  const iterator = stream[Symbol.asyncIterator]();

  saveMeasurement(db, fakeMeasurement(1000));
  // De eerste meting (de laatste uit de database) bewijst dat de stroom al luistert.
  assert.equal((await iterator.next()).value?.event.value?.timestampMs, 1000n);

  // Alleen gemeld, niet opgeslagen: room2 bestaat niet in de database.
  publishMeasurement({ id: 2, ...fakeMeasurement(2000, { room_id: "room2" }) });
  publishMeasurement(saveMeasurement(db, fakeMeasurement(3000)));

  const next = (await iterator.next()).value?.event.value;
  assert.equal(next?.roomId, DEFAULT_ROOM.id);
  assert.equal(next?.timestampMs, 3000n);
  abort.abort();
});
