// De echte hardware: GrovePi en OLED op de I²C-bus van de Pi.
import { openPromisified } from "i2c-bus";
import {
  BUZZER_PORT,
  GROVEPI_I2C_ADDRESS,
  I2C_BUS_NUMBER,
  LED_PORT,
  LIGHT_PORT,
  MOTION_PORT,
  OLED_I2C_ADDRESS,
  TEMPERATURE_HUMIDITY_PORT,
} from "../config.ts";
import { createGrovePi } from "./grovepi.ts";
import { createI2cLock } from "./i2c-lock.ts";
import { createOledDisplay } from "./oled.ts";
import type { Hardware } from "./types.ts";

export async function openRealHardware(): Promise<Hardware> {
  const bus = await openPromisified(I2C_BUS_NUMBER);
  const lock = createI2cLock();
  const grovePi = createGrovePi(bus, GROVEPI_I2C_ADDRESS, lock);
  const display = createOledDisplay(bus, OLED_I2C_ADDRESS, lock);

  await grovePi.setPinMode(MOTION_PORT, "input");
  await grovePi.setPinMode(LED_PORT, "output");
  await grovePi.setPinMode(BUZZER_PORT, "output");
  // Na een herstart van het programma kan de buzzer nog aan staan van de vorige keer.
  await grovePi.digitalWrite(LED_PORT, false);
  await grovePi.digitalWrite(BUZZER_PORT, false);

  return {
    readTemperatureHumidity: () => grovePi.readDht22(TEMPERATURE_HUMIDITY_PORT),
    readLightRaw: () => grovePi.analogRead(LIGHT_PORT),
    readMotionDetected: () => grovePi.digitalRead(MOTION_PORT),
    setLed: (on) => grovePi.digitalWrite(LED_PORT, on),
    setBuzzer: (on) => grovePi.digitalWrite(BUZZER_PORT, on),
    showOnDisplay: (lines) => display.show(lines),
    async close() {
      await grovePi.digitalWrite(LED_PORT, false);
      await grovePi.digitalWrite(BUZZER_PORT, false);
      await display.clear();
      await bus.close();
    },
  };
}
