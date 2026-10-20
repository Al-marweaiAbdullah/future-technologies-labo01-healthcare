// Grove OLED Display 96×96 v2.1 (SSD1327, 16 grijstinten), rechtstreeks op de I²C-bus.
// Geen library: de bekende OLED-libraries voor Node ondersteunen alleen SSD1306 en SH1106.
// De instellingen komen uit Seeeds eigen library (github.com/Seeed-Studio/OLED_Display_96X96).
import type { PromisifiedBus } from "i2c-bus";
import type { I2cLock } from "./i2c-lock.ts";
import { FRAME_BYTES, packFrame, renderLines } from "./oled-frame.ts";

// Eerste byte van elke I²C-transactie: zegt of de rest een commando of beelddata is.
const CONTROL_COMMAND = 0x80;
const CONTROL_DATA = 0x40;

// Zoveel beelddata per transactie: groter is sneller, maar niet elke I²C-driver kan heel lange.
const DATA_CHUNK_BYTES = 32;

const INIT_COMMANDS = [
  [0xfd, 0x12], // commando's ontgrendelen
  [0xae], // scherm uit tijdens het instellen
  [0xa8, 0x5f], // 96 rijen
  [0xa1, 0x00], // startlijn 0
  [0xa2, 0x60], // verschuiving zodat rij 0 bovenaan staat
  [0xa0, 0x42], // remap: horizontaal adresseren (rij per rij)
  [0xab, 0x01], // interne spanningsregelaar aan
  [0x81, 0x53], // contrast
  [0xb1, 0x51], // fase-lengte
  [0xb3, 0x01], // klok
  [0xb9], // standaard grijstinten
  [0xbc, 0x08], // pre-charge spanning
  [0xbe, 0x07], // VCOMH
  [0xb6, 0x01], // tweede pre-charge
  [0xd5, 0x62], // tweede pre-charge en externe VSL aan
  [0xa4], // normale weergave
  [0x2e], // scrollen uit
  [0xaf], // scherm aan
].flat();

// Het scherm gebruikt kolommen 8 tot 55 van de chip (elke kolom = 2 pixels) en rijen 0 tot 95.
const FULL_WINDOW_COMMANDS = [0x15, 0x08, 0x37, 0x75, 0x00, 0x5f];

export type OledDisplay = {
  show(lines: string[]): Promise<void>;
  clear(): Promise<void>;
};

export function createOledDisplay(
  bus: PromisifiedBus,
  address: number,
  lock: I2cLock,
): OledDisplay {
  // Pas instellen bij het eerste gebruik. Mislukt dat (bv. scherm los), dan proberen we het
  // de volgende keer opnieuw in plaats van de rest van het programma te laten crashen.
  let initialized = false;

  async function sendCommands(commands: number[]): Promise<void> {
    for (const command of commands) {
      await bus.writeByte(address, CONTROL_COMMAND, command);
    }
  }

  async function sendFrame(frame: Buffer): Promise<void> {
    if (!initialized) {
      await sendCommands(INIT_COMMANDS);
      initialized = true;
    }
    await sendCommands(FULL_WINDOW_COMMANDS);
    for (let start = 0; start < frame.length; start += DATA_CHUNK_BYTES) {
      const chunk = frame.subarray(start, start + DATA_CHUNK_BYTES);
      const message = Buffer.concat([Buffer.from([CONTROL_DATA]), chunk]);
      await bus.i2cWrite(address, message.length, message);
    }
  }

  return {
    async show(lines) {
      const frame = packFrame(renderLines(lines));
      await lock(() => sendFrame(frame));
    },
    async clear() {
      await lock(() => sendFrame(Buffer.alloc(FRAME_BYTES)));
    },
  };
}
