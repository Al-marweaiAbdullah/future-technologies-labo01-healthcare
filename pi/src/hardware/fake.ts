// Nep-hardware voor ontwikkelen en testen zonder Pi. Verzonnen waarden, nooit echte gegevens.
import type { Hardware } from "./types.ts";

const TEMPERATURE_CENTER_C = 21;
const TEMPERATURE_SPREAD_C = 1.5;
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
      return {
        temperatureC: round1(randomAround(TEMPERATURE_CENTER_C, TEMPERATURE_SPREAD_C)),
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
