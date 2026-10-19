// Verzonnen metingen voor ontwikkelen en testen zonder sensoren. Nooit echte patiëntgegevens.
import {
  createAlarm,
  getOpenAlarmForSensor,
  saveMeasurement,
  type Db,
  type NewMeasurement,
} from "../db/index.ts";
import { publishAlarm, publishMeasurement } from "./events.ts";

const TEMPERATURE_BASE_C = 21;
const TEMPERATURE_SWING_C = 4; // schommelt tussen 17 en 25 °C, zodat er af en toe een alarm komt
const TEMPERATURE_PERIOD_MS = 60_000;
const TEMPERATURE_ALARM_ABOVE_C = 24;
const MOTION_CHANCE = 0.1;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function randomAround(center: number, spread: number): number {
  return center + (Math.random() * 2 - 1) * spread;
}

export function fakeMeasurement(roomId: string, nowMs: number): NewMeasurement {
  const phase = (2 * Math.PI * nowMs) / TEMPERATURE_PERIOD_MS;
  return {
    room_id: roomId,
    timestamp_ms: nowMs,
    temperature_c: round1(TEMPERATURE_BASE_C + TEMPERATURE_SWING_C * Math.sin(phase)),
    humidity_percent: round1(randomAround(45, 5)),
    light_raw: Math.round(randomAround(300, 50)),
    sound_raw: Math.round(randomAround(200, 100)),
    motion: Math.random() < MOTION_CHANCE ? 1 : 0,
  };
}

// Slaat elke `intervalMs` een nepmeting op en meldt ze, plus een alarm als het te warm wordt.
// Geeft een functie terug die het stopt.
export function startFakeData(db: Db, roomId: string, intervalMs: number): () => void {
  const timer = setInterval(() => {
    const measurement = saveMeasurement(db, fakeMeasurement(roomId, Date.now()));
    publishMeasurement(measurement);

    const tooWarm = (measurement.temperature_c ?? 0) > TEMPERATURE_ALARM_ABOVE_C;
    if (tooWarm && !getOpenAlarmForSensor(db, roomId, "temperature")) {
      const alarm = createAlarm(db, {
        room_id: roomId,
        sensor: "temperature",
        value: measurement.temperature_c,
        reason: "Temperatuur te hoog",
        started_at_ms: measurement.timestamp_ms,
      });
      publishAlarm(alarm);
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
