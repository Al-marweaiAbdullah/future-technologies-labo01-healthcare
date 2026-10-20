// Startpunt van RestWell op de Pi: leest de sensoren, slaat de metingen op, controleert alarmen,
// stuurt LED, buzzer en OLED aan en stelt alles via gRPC beschikbaar.
// Zonder Pi: `npm run dev:fake`, dan komen de metingen van de nep-hardware.
import { setTimeout as sleep } from "node:timers/promises";
import { decideRoomOutput, evaluateMeasurement, type ExceededSince } from "./alarms/index.ts";
import { DB_PATH, GRPC_PORT, SAMPLE_INTERVAL_MS, USE_FAKE_HARDWARE } from "./config.ts";
import {
  createAlarm,
  DEFAULT_ROOM,
  listOpenAlarms,
  listThresholds,
  openDatabase,
  resolveAlarm,
  saveMeasurement,
  seedDefaults,
  type NewMeasurement,
} from "./db/index.ts";
import { publishAlarm, publishMeasurement, startGrpcServer } from "./grpc/index.ts";
import {
  openHardware,
  readAllSensors,
  wrapForDisplay,
  type Hardware,
  type SensorReadings,
} from "./hardware/index.ts";

// Eén Pi bewaakt één kamer.
const ROOM_ID = DEFAULT_ROOM.id;

const DISPLAY_TITLE = "RestWell";
const MISSING_VALUE = "-";

async function openHardwareOrExit(): Promise<Hardware> {
  try {
    return await openHardware();
  } catch (error) {
    console.error(
      "Hardware openen mislukt. Werk je zonder Pi? Start dan met `npm run dev:fake`.",
      error,
    );
    process.exit(1);
  }
}

const db = openDatabase(DB_PATH);
seedDefaults(db);
const hardware = await openHardwareOrExit();
startGrpcServer(db, GRPC_PORT);

// Blijft bewaard tussen twee metingen, zodat alarms/ weet hoe lang een waarde al buiten de drempel zit.
let exceededSince: ExceededSince = new Map();

function toMeasurement(readings: SensorReadings, nowMs: number): NewMeasurement {
  return {
    room_id: ROOM_ID,
    timestamp_ms: nowMs,
    temperature_c: readings.temperatureC,
    humidity_percent: readings.humidityPercent,
    light_raw: readings.lightRaw,
    motion: readings.motionDetected === null ? null : readings.motionDetected ? 1 : 0,
  };
}

function processMeasurement(measurement: NewMeasurement, nowMs: number): void {
  publishMeasurement(saveMeasurement(db, measurement));

  const openAlarms = listOpenAlarms(db, ROOM_ID);
  const result = evaluateMeasurement({
    measurement,
    thresholds: listThresholds(db, ROOM_ID),
    openAlarms,
    exceededSince,
    nowMs,
  });
  exceededSince = result.exceededSince;

  for (const alarm of result.alarmsToCreate) {
    publishAlarm(createAlarm(db, alarm));
  }
  for (const alarmId of result.alarmIdsToResolve) {
    const alarm = openAlarms.find((open) => open.id === alarmId);
    // resolveAlarm geeft geen rij terug, dus de app krijgt de open rij met de nieuwe status.
    if (resolveAlarm(db, alarmId, nowMs) && alarm) {
      publishAlarm({ ...alarm, status: "resolved", resolved_at_ms: nowMs });
    }
  }
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return MISSING_VALUE;
  return `${value.toLocaleString("nl-BE", { useGrouping: false })}${unit}`;
}

function formatMotion(detected: boolean | null): string {
  if (detected === null) return MISSING_VALUE;
  return detected ? "ja" : "nee";
}

function displayLines(readings: SensorReadings, displayText: string): string[] {
  return [
    DISPLAY_TITLE,
    `Temp:  ${formatValue(readings.temperatureC, " °C")}`,
    `Vocht: ${formatValue(readings.humidityPercent, " %")}`,
    `Licht: ${formatValue(readings.lightRaw, "")}`,
    `Beweging: ${formatMotion(readings.motionDetected)}`,
    "",
    ...wrapForDisplay(displayText),
  ];
}

// Bij elke meting opnieuw berekenen, ook zonder nieuw alarm: de buzzer gaat pas aan
// als een alarm buzzer_after_sec lang niet bevestigd is.
async function updateRoomOutput(readings: SensorReadings, nowMs: number): Promise<void> {
  const output = decideRoomOutput(listOpenAlarms(db, ROOM_ID), nowMs);
  await hardware.setLed(output.led);
  await hardware.setBuzzer(output.buzzer);
  await hardware.showOnDisplay(displayLines(readings, output.displayText));
}

async function sampleOnce(): Promise<void> {
  // readAllSensors geeft null voor een sensor die faalt; alarms/ doet niets met null.
  const readings = await readAllSensors(hardware);
  const nowMs = Date.now();
  processMeasurement(toMeasurement(readings, nowMs), nowMs);
  await updateRoomOutput(readings, nowMs);
}

let stopRequested = false;

// Geen setInterval: een meting (DHT22 + OLED) kan langer duren dan het interval,
// en twee metingen tegelijk mogen niet.
async function sampleUntilStopped(): Promise<void> {
  while (!stopRequested) {
    const startedMs = Date.now();
    try {
      await sampleOnce();
    } catch (error) {
      // Eén mislukte meting mag de server niet laten stoppen; de volgende probeert het opnieuw.
      console.error("Meting verwerken mislukt:", error);
    }
    await sleep(Math.max(0, SAMPLE_INTERVAL_MS - (Date.now() - startedMs)));
  }
}

function requestStop(): void {
  stopRequested = true;
}
process.on("SIGINT", requestStop);
process.on("SIGTERM", requestStop);

console.log(
  `RestWell gestart met ${USE_FAKE_HARDWARE ? "nep-hardware" : "de sensoren"}, ` +
    `meting elke ${SAMPLE_INTERVAL_MS} ms, database: ${DB_PATH}`,
);

await sampleUntilStopped();

// LED en buzzer uit en het scherm leeg, zodat er na het stoppen niets blijft piepen.
try {
  await hardware.close();
} catch (error) {
  console.error("Hardware afsluiten mislukt:", error);
}
db.close();
console.log("RestWell gestopt");
process.exit(0);
