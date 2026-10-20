// Startpunt van RestWell op de Pi: leest metingen, slaat ze op, controleert alarmen en stelt alles via gRPC beschikbaar.
// Zolang er geen sensoren zijn, komen de metingen van fakeMeasurement; de rest (database, alarmen, gRPC) is echt.
import { evaluateMeasurement, type ExceededSince } from "./alarms/index.ts";
import { DB_PATH, GRPC_PORT, SAMPLE_INTERVAL_MS } from "./config.ts";
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
import {
  fakeMeasurement,
  publishAlarm,
  publishMeasurement,
  startGrpcServer,
} from "./grpc/index.ts";

// Eén Pi bewaakt één kamer.
const ROOM_ID = DEFAULT_ROOM.id;

const db = openDatabase(DB_PATH);
seedDefaults(db);
startGrpcServer(db, GRPC_PORT);

// Blijft bewaard tussen twee metingen, zodat alarms/ weet hoe lang een waarde al buiten de drempel zit.
let exceededSince: ExceededSince = new Map();

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

  // TODO(hardware): stuur LED, buzzer en OLED aan zodra hardware/ daar functies voor aanbiedt.
  // decideRoomOutput(listOpenAlarms(db, ROOM_ID), nowMs) uit alarms/ geeft { led, buzzer, displayText }.
  // De buzzer gaat pas na buzzer_after_sec aan, dus bereken dit bij elke meting opnieuw,
  // ook als er geen nieuw alarm is.
}

// Eén regel per nepmeting, zodat je in de terminal ziet dat er elke interval iets opgeslagen wordt.
function describeFakeMeasurement(measurement: NewMeasurement): string {
  const time = new Date(measurement.timestamp_ms).toLocaleTimeString("nl-BE");
  return (
    `[${time}] Nepmeting opgeslagen: ${measurement.temperature_c} °C, ` +
    `${measurement.humidity_percent} %, licht ${measurement.light_raw}, ` +
    `beweging ${measurement.motion ? "ja" : "nee"}`
  );
}

function sampleOnce(): void {
  const nowMs = Date.now();
  try {
    // TODO(hardware): lees hier de echte sensoren uit via hardware/ in plaats van fakeMeasurement.
    // - Dat wordt waarschijnlijk async: maak sampleOnce dan async en gebruik await.
    // - Een sensor die faalt geeft null voor zijn waarde (de kolommen zijn nullable),
    //   zodat de andere sensoren gewoon doorlopen. alarms/ doet niets met null.
    // - Verwijder dan fakeMeasurement uit grpc/ als niemand het nog gebruikt.
    // - Haal ook de log hieronder weg: echte meetwaarden horen niet in de log (zie AGENTS.md).
    const measurement = fakeMeasurement(ROOM_ID, nowMs);
    processMeasurement(measurement, nowMs);
    console.log(describeFakeMeasurement(measurement));
  } catch (error) {
    // Eén mislukte meting mag de server niet laten stoppen; de volgende probeert het opnieuw.
    console.error("Meting verwerken mislukt:", error);
  }
}

setInterval(sampleOnce, SAMPLE_INTERVAL_MS);

console.log(`RestWell gestart met nepmetingen elke ${SAMPLE_INTERVAL_MS} ms, database: ${DB_PATH}`);
