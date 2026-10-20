// Praat met de microcontroller op de GrovePi. Alle Grove-poorten (D2, A0, ...) lopen via dit bord.
import type { PromisifiedBus } from "i2c-bus";
import { setTimeout as sleep } from "node:timers/promises";
import {
  ANALOG_RESPONSE_BYTES,
  COMMAND,
  COMMAND_REGISTER,
  decodeAnalog,
  decodeDht,
  decodeDigital,
  DHT_RESPONSE_BYTES,
  DIGITAL_RESPONSE_BYTES,
  encodeCommand,
  encodeDhtRead,
  PIN_MODE,
} from "./grovepi-protocol.ts";
import type { I2cLock } from "./i2c-lock.ts";
import type { TemperatureHumidity } from "./types.ts";

// Tijd die de firmware nodig heeft om een commando te verwerken of een antwoord klaar te zetten.
// Ook na een schrijfcommando wachten: de firmware heeft één buffer, en een volgend commando
// dat te vroeg komt, overschrijft het vorige (bv. LED aan, meteen gevolgd door buzzer uit).
const RESPONSE_DELAY_MS = 50;
const DHT_RESPONSE_DELAY_MS = 600;

export type GrovePi = {
  setPinMode(pin: number, mode: keyof typeof PIN_MODE): Promise<void>;
  digitalRead(pin: number): Promise<boolean>;
  digitalWrite(pin: number, on: boolean): Promise<void>;
  analogRead(pin: number): Promise<number>;
  readDht22(pin: number): Promise<TemperatureHumidity>;
};

export function createGrovePi(bus: PromisifiedBus, address: number, lock: I2cLock): GrovePi {
  async function send(command: Buffer): Promise<void> {
    await bus.writeI2cBlock(address, COMMAND_REGISTER, command.length, command);
  }

  async function command(bytes: Buffer): Promise<void> {
    await lock(async () => {
      await send(bytes);
      await sleep(RESPONSE_DELAY_MS);
    });
  }

  async function request(command: Buffer, delayMs: number, responseBytes: number): Promise<Buffer> {
    return lock(async () => {
      await send(command);
      await sleep(delayMs);
      const response = Buffer.alloc(responseBytes);
      await bus.i2cRead(address, responseBytes, response);
      return response;
    });
  }

  return {
    async setPinMode(pin, mode) {
      await command(encodeCommand(COMMAND.pinMode, pin, PIN_MODE[mode]));
    },
    async digitalRead(pin) {
      const command = encodeCommand(COMMAND.digitalRead, pin);
      return decodeDigital(await request(command, RESPONSE_DELAY_MS, DIGITAL_RESPONSE_BYTES));
    },
    async digitalWrite(pin, on) {
      await command(encodeCommand(COMMAND.digitalWrite, pin, on ? 1 : 0));
    },
    async analogRead(pin) {
      const command = encodeCommand(COMMAND.analogRead, pin);
      return decodeAnalog(await request(command, RESPONSE_DELAY_MS, ANALOG_RESPONSE_BYTES));
    },
    async readDht22(pin) {
      return decodeDht(
        await request(encodeDhtRead(pin), DHT_RESPONSE_DELAY_MS, DHT_RESPONSE_BYTES),
      );
    },
  };
}
