// Verzonnen metingen voor ontwikkelen en testen zonder sensoren. Nooit echte patiëntgegevens.
import type { NewMeasurement } from "../db/index.ts";

const TEMPERATURE_BASE_C = 21;
const TEMPERATURE_SWING_C = 4; // schommelt tussen 17 en 25 °C, zodat de drempels (18-24 °C) af en toe overschreden worden
const TEMPERATURE_PERIOD_MS = 60_000;
const MOTION_CHANCE = 0.1;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function randomAround(center: number, spread: number): number {
  return center + (Math.random() * 2 - 1) * spread;
}

// Een verzonnen meting op tijdstip `nowMs`, tot de echte sensoren er zijn (zie main.ts).
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
