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
  resolveAlarm,
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

function tooWarmAlarm(): number {
  return createAlarm(db, {
    room_id: DEFAULT_ROOM.id,
    sensor: "temperature",
    value: 26,
    reason: "Te warm: 26 °C",
    started_at_ms: 1000,
  }).id;
}

test("AcknowledgeAlarm zet een actief alarm op gezien en geeft het terug", async () => {
  const alarmId = tooWarmAlarm();

  const { alarm } = await client.acknowledgeAlarm({
    alarmId: BigInt(alarmId),
    acknowledgedBy: " VP ",
  });

  assert.equal(alarm?.status, AlarmStatus.ACKNOWLEDGED);
  assert.equal(alarm?.acknowledgedBy, "VP");
  assert.notEqual(alarm?.acknowledgedAtMs, undefined);
  const [open] = (await client.listOpenAlarms({ roomId: DEFAULT_ROOM.id })).alarms;
  assert.equal(open?.status, AlarmStatus.ACKNOWLEDGED);
});

test("AcknowledgeAlarm meldt de wijziging aan WatchRoom", async () => {
  const alarmId = tooWarmAlarm();
  saveMeasurement(db, fakeMeasurement(1000));
  const abort = new AbortController();
  const stream = client.watchRoom({ roomId: DEFAULT_ROOM.id }, { signal: abort.signal });
  const iterator = stream[Symbol.asyncIterator]();
  // De eerste meting bewijst dat de stroom al luistert.
  assert.equal((await iterator.next()).value?.event.case, "reading");

  await client.acknowledgeAlarm({ alarmId: BigInt(alarmId), acknowledgedBy: "VP" });

  const event = (await iterator.next()).value?.event;
  assert.equal(event?.case, "alarm");
  assert.equal(event?.case === "alarm" ? event.value.status : undefined, AlarmStatus.ACKNOWLEDGED);
  abort.abort();
});

test("AcknowledgeAlarm twee keer: de eerste bevestiging blijft staan", async () => {
  const alarmId = tooWarmAlarm();
  const first = await client.acknowledgeAlarm({ alarmId: BigInt(alarmId), acknowledgedBy: "VP" });

  const second = await client.acknowledgeAlarm({ alarmId: BigInt(alarmId), acknowledgedBy: "HV" });

  assert.equal(second.alarm?.acknowledgedBy, "VP");
  assert.equal(second.alarm?.acknowledgedAtMs, first.alarm?.acknowledgedAtMs);
});

test("AcknowledgeAlarm: onbekend alarm geeft NOT_FOUND", async () => {
  await assertConnectCode(
    client.acknowledgeAlarm({ alarmId: 999n, acknowledgedBy: "VP" }),
    Code.NotFound,
  );
});

test("ListOpenAlarms toont een opgelost alarm tot iemand het zag", async () => {
  const alarmId = tooWarmAlarm();
  resolveAlarm(db, alarmId, 2000);

  const [shown] = (await client.listOpenAlarms({ roomId: DEFAULT_ROOM.id })).alarms;
  assert.equal(shown?.status, AlarmStatus.RESOLVED);
  assert.equal(shown?.acknowledgedAtMs, undefined);

  await client.acknowledgeAlarm({ alarmId: BigInt(alarmId), acknowledgedBy: "VP" });
  assert.deepEqual((await client.listOpenAlarms({ roomId: DEFAULT_ROOM.id })).alarms, []);
});

test("ListAlarms houdt een opgelost en gezien alarm in de geschiedenis", async () => {
  const alarmId = tooWarmAlarm();
  resolveAlarm(db, alarmId, 2000);
  await client.acknowledgeAlarm({ alarmId: BigInt(alarmId), acknowledgedBy: "VP" });

  const { alarms } = await client.listAlarms({ roomId: DEFAULT_ROOM.id, sinceMs: 0n });
  assert.deepEqual(
    alarms.map((alarm) => [alarm.id, alarm.status, alarm.acknowledgedBy]),
    [[BigInt(alarmId), AlarmStatus.RESOLVED, "VP"]],
  );
  assert.deepEqual(
    (await client.listAlarms({ roomId: DEFAULT_ROOM.id, sinceMs: 3000n })).alarms,
    [],
  );
});

test("ListAlarms: onbekende kamer geeft NOT_FOUND", async () => {
  await assertConnectCode(client.listAlarms({ roomId: "unknown", sinceMs: 0n }), Code.NotFound);
});

test("AcknowledgeAlarm markeert een opgelost alarm dat niemand zag als gezien", async () => {
  const alarmId = tooWarmAlarm();
  resolveAlarm(db, alarmId, 2000);

  const { alarm } = await client.acknowledgeAlarm({
    alarmId: BigInt(alarmId),
    acknowledgedBy: "VP",
  });

  assert.equal(alarm?.status, AlarmStatus.RESOLVED);
  assert.equal(alarm?.acknowledgedBy, "VP");
  assert.notEqual(alarm?.acknowledgedAtMs, undefined);
});

test("AcknowledgeAlarm zonder acknowledged_by geeft INVALID_ARGUMENT", async () => {
  const alarmId = tooWarmAlarm();

  await assertConnectCode(
    client.acknowledgeAlarm({ alarmId: BigInt(alarmId), acknowledgedBy: "  " }),
    Code.InvalidArgument,
  );
});

test("ListThresholds geeft de drempels van de kamer, met lege velden voor geen grens", async () => {
  const { thresholds } = await client.listThresholds({ roomId: DEFAULT_ROOM.id });

  const temperature = thresholds.find((t) => t.metric === Metric.TEMPERATURE);
  assert.equal(temperature?.roomId, DEFAULT_ROOM.id);
  assert.equal(temperature?.minValue, 18);
  assert.equal(temperature?.maxValue, 24);
  assert.equal(temperature?.maxDurationSec, undefined);
  assert.equal(
    thresholds.some((t) => t.metric === Metric.MOTION),
    false,
  );
});

test("UpdateThreshold past een drempel aan; een leeg veld betekent geen grens", async () => {
  const { threshold } = await client.updateThreshold({
    threshold: { roomId: DEFAULT_ROOM.id, metric: Metric.TEMPERATURE, maxValue: 26 },
  });

  assert.equal(threshold?.minValue, undefined);
  assert.equal(threshold?.maxValue, 26);
  const { thresholds } = await client.listThresholds({ roomId: DEFAULT_ROOM.id });
  const temperature = thresholds.find((t) => t.metric === Metric.TEMPERATURE);
  assert.equal(temperature?.minValue, undefined);
  assert.equal(temperature?.maxValue, 26);
});

test("ListThresholds geeft de actieve uren: licht 's nachts, temperatuur altijd", async () => {
  const { thresholds } = await client.listThresholds({ roomId: DEFAULT_ROOM.id });

  const light = thresholds.find((t) => t.metric === Metric.LIGHT);
  assert.equal(light?.activeFromHour, 22);
  assert.equal(light?.activeToHour, 7);
  const temperature = thresholds.find((t) => t.metric === Metric.TEMPERATURE);
  assert.equal(temperature?.activeFromHour, undefined);
  assert.equal(temperature?.activeToHour, undefined);
});

test("UpdateThreshold past de actieve uren aan", async () => {
  const { threshold } = await client.updateThreshold({
    threshold: {
      roomId: DEFAULT_ROOM.id,
      metric: Metric.LIGHT,
      maxValue: 500,
      activeFromHour: 8,
      activeToHour: 20,
    },
  });

  assert.equal(threshold?.activeFromHour, 8);
  assert.equal(threshold?.activeToHour, 20);
  const { thresholds } = await client.listThresholds({ roomId: DEFAULT_ROOM.id });
  const light = thresholds.find((t) => t.metric === Metric.LIGHT);
  assert.equal(light?.activeFromHour, 8);
  assert.equal(light?.activeToHour, 20);
});

test("UpdateThreshold zonder uren laat de actieve uren ongewijzigd", async () => {
  const { threshold } = await client.updateThreshold({
    threshold: { roomId: DEFAULT_ROOM.id, metric: Metric.LIGHT, maxValue: 500 },
  });

  assert.equal(threshold?.maxValue, 500);
  assert.equal(threshold?.activeFromHour, 22);
  assert.equal(threshold?.activeToHour, 7);
});

test("UpdateThreshold weigert ongeldige uren met INVALID_ARGUMENT", async () => {
  const light = { roomId: DEFAULT_ROOM.id, metric: Metric.LIGHT, maxValue: 500 };
  await assertConnectCode(
    client.updateThreshold({ threshold: { ...light, activeFromHour: 22 } }),
    Code.InvalidArgument,
  );
  await assertConnectCode(
    client.updateThreshold({ threshold: { ...light, activeFromHour: 22, activeToHour: 24 } }),
    Code.InvalidArgument,
  );
  await assertConnectCode(
    client.updateThreshold({ threshold: { ...light, activeFromHour: 8, activeToHour: 8 } }),
    Code.InvalidArgument,
  );
});

test("UpdateThreshold weigert ongeldige waarden met INVALID_ARGUMENT", async () => {
  await assertConnectCode(
    client.updateThreshold({
      threshold: {
        roomId: DEFAULT_ROOM.id,
        metric: Metric.TEMPERATURE,
        minValue: 30,
        maxValue: 20,
      },
    }),
    Code.InvalidArgument,
  );
  await assertConnectCode(
    client.updateThreshold({ threshold: { roomId: DEFAULT_ROOM.id } }),
    Code.InvalidArgument,
  );
  await assertConnectCode(client.updateThreshold({}), Code.InvalidArgument);
});

test("UpdateThreshold: onbekende kamer of sensor zonder drempel geeft NOT_FOUND", async () => {
  await assertConnectCode(
    client.updateThreshold({ threshold: { roomId: "unknown", metric: Metric.TEMPERATURE } }),
    Code.NotFound,
  );
  await assertConnectCode(
    client.updateThreshold({ threshold: { roomId: DEFAULT_ROOM.id, metric: Metric.MOTION } }),
    Code.NotFound,
  );
  await assertConnectCode(client.listThresholds({ roomId: "unknown" }), Code.NotFound);
});
