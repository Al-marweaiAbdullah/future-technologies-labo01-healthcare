// Wat hardware/ aanbiedt aan de rest van de Pi-code. Importeer alleen uit dit bestand.
import { USE_FAKE_HARDWARE } from "../config.ts";
import { createFakeHardware } from "./fake.ts";
import type { Hardware } from "./types.ts";

// Echte hardware, of de nep-versie als RESTWELL_FAKE_HARDWARE=1.
export async function openHardware(): Promise<Hardware> {
  if (USE_FAKE_HARDWARE) return createFakeHardware();
  // Pas hier laden: real.ts gebruikt i2c-bus, een native module die alleen op Linux werkt.
  // Anders crasht `npm run dev:fake` op een Mac al bij het opstarten.
  const { openRealHardware } = await import("./real.ts");
  return openRealHardware();
}

export { createFakeHardware, type FakeHardware } from "./fake.ts";
export { readAllSensors } from "./read-all.ts";
export { DISPLAY_MAX_CHARS_PER_LINE, DISPLAY_MAX_LINES, wrapForDisplay } from "./oled-frame.ts";
export { ANALOG_MAX as LIGHT_RAW_MAX } from "./grovepi-protocol.ts";
export type * from "./types.ts";
