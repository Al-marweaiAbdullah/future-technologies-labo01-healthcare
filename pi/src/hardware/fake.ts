// Nep-hardware voor ontwikkelen en testen zonder Pi. Verzonnen waarden, nooit echte gegevens.
import type { Hardware } from "./types.ts";

const TEMPERATURE_BASE_C = 21;
// Schommelt tussen 17 en 25 °C, zodat de drempels (18-24 °C) af en toe overschreden worden
// en je ook zonder Pi alarmen ziet.
const TEMPERATURE_SWING_C = 4;
const TEMPERATURE_PERIOD_MS = 60_000;
const HUMIDITY_CENTER_PERCENT = 45;
const HUMIDITY_SPREAD_PERCENT = 5;
const LIGHT_CENTER_RAW = 300;
const LIGHT_SPREAD_RAW = 50;
const MOTION_CHANCE = 0.1;

function randomAround(center: number, spread: number): number {
  return center + (Math.random() * 2 - 1) * spread;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// De nep-LED, -buzzer en -OLED onthouden wat ze moeten tonen, zodat tests dat kunnen nakijken.
export type FakeHardware = Hardware & {
  readonly state: { led: boolean; buzzer: boolean; displayLines: string[] };
};

export function createFakeHardware(): FakeHardware {
  const state = { led: false, buzzer: false, displayLines: [] as string[] };
  return {
    state,
    async readTemperatureHumidity() {
      const phase = (2 * Math.PI * Date.now()) / TEMPERATURE_PERIOD_MS;
      return {
        temperatureC: round1(TEMPERATURE_BASE_C + TEMPERATURE_SWING_C * Math.sin(phase)),
        humidityPercent: round1(randomAround(HUMIDITY_CENTER_PERCENT, HUMIDITY_SPREAD_PERCENT)),
      };
    },
    async readLightRaw() {
      return Math.round(randomAround(LIGHT_CENTER_RAW, LIGHT_SPREAD_RAW));
    },
    async readMotionDetected() {
      return Math.random() < MOTION_CHANCE;
    },
    async setLed(on) {
      state.led = on;
    },
    async setBuzzer(on) {
      state.buzzer = on;
    },
    async showOnDisplay(lines) {
      state.displayLines = [...lines];
    },
    async close() {
      state.led = false;
      state.buzzer = false;
      state.displayLines = [];
    },
  };
}
