// Het I²C-protocol van de GrovePi-firmware: commando's opbouwen en antwoorden omzetten.
// Pure functies zonder hardware, zodat ze te testen zijn.
import type { TemperatureHumidity } from "./types.ts";

// Commando's schrijf je als blok van 4 bytes naar dit register.
export const COMMAND_REGISTER = 1;

export const COMMAND = {
  digitalRead: 1,
  digitalWrite: 2,
  analogRead: 3,
  pinMode: 5,
  dhtRead: 40,
} as const;

export const PIN_MODE = { input: 0, output: 1 } as const;

const DHT_TYPE_DHT22 = 1; // de witte sensor; 0 is de blauwe DHT11

export const DIGITAL_RESPONSE_BYTES = 1;
export const ANALOG_RESPONSE_BYTES = 3;
export const DHT_RESPONSE_BYTES = 9;

export const ANALOG_MAX = 1023; // 10-bit ADC

// Meetbereik van de DHT22 volgens de datasheet. Alles daarbuiten is een leesfout.
const DHT22_MIN_TEMPERATURE_C = -40;
const DHT22_MAX_TEMPERATURE_C = 80;
const HUMIDITY_MIN_PERCENT = 0;
const HUMIDITY_MAX_PERCENT = 100;

export function encodeCommand(command: number, pin: number, value = 0): Buffer {
  return Buffer.from([command, pin, value, 0]);
}

export function encodeDhtRead(pin: number): Buffer {
  return encodeCommand(COMMAND.dhtRead, pin, DHT_TYPE_DHT22);
}

export function decodeDigital(response: Buffer): boolean {
  const value = response[0];
  if (value !== 0 && value !== 1) {
    throw new Error(`GrovePi gaf een ongeldige digitale waarde: ${String(value)}`);
  }
  return value === 1;
}

// Antwoord: [commando, hoge byte, lage byte].
export function decodeAnalog(response: Buffer): number {
  if (response.length < ANALOG_RESPONSE_BYTES) {
    throw new Error(
      `GrovePi gaf ${response.length} bytes terug, ${ANALOG_RESPONSE_BYTES} verwacht`,
    );
  }
  const value = response.readUInt16BE(1);
  if (value > ANALOG_MAX) {
    throw new Error(`GrovePi gaf een ongeldige analoge waarde: ${value}`);
  }
  return value;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Antwoord: [commando, temperatuur als float32 LE, vochtigheid als float32 LE].
export function decodeDht(response: Buffer): TemperatureHumidity {
  if (response.length < DHT_RESPONSE_BYTES) {
    throw new Error(`GrovePi gaf ${response.length} bytes terug, ${DHT_RESPONSE_BYTES} verwacht`);
  }
  const temperatureC = response.readFloatLE(1);
  const humidityPercent = response.readFloatLE(5);
  const temperatureValid =
    temperatureC >= DHT22_MIN_TEMPERATURE_C && temperatureC <= DHT22_MAX_TEMPERATURE_C;
  const humidityValid =
    humidityPercent >= HUMIDITY_MIN_PERCENT && humidityPercent <= HUMIDITY_MAX_PERCENT;
  // NaN valt ook buiten beide bereiken: zo meldt de firmware een mislukte meting.
  if (!temperatureValid || !humidityValid) {
    throw new Error(`DHT22 gaf een ongeldige meting: ${temperatureC} °C, ${humidityPercent} %`);
  }
  return { temperatureC: round1(temperatureC), humidityPercent: round1(humidityPercent) };
}
