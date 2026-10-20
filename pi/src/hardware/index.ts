// Wat hardware/ aanbiedt aan de rest van de Pi-code. Importeer alleen uit dit bestand.
import { USE_FAKE_HARDWARE } from "../config.ts";
import { createFakeHardware } from "./fake.ts";
import { openRealHardware } from "./real.ts";
import type { Hardware } from "./types.ts";

// Echte hardware, of de nep-versie als RESTWELL_FAKE_HARDWARE=1.
export async function openHardware(): Promise<Hardware> {
  return USE_FAKE_HARDWARE ? createFakeHardware() : openRealHardware();
}

export { createFakeHardware, type FakeHardware } from "./fake.ts";
export { readAllSensors } from "./read-all.ts";
export { DISPLAY_MAX_CHARS_PER_LINE, DISPLAY_MAX_LINES } from "./oled-frame.ts";
export { ANALOG_MAX as LIGHT_RAW_MAX } from "./grovepi-protocol.ts";
export type * from "./types.ts";
