// Centrale configuratie van RestWell. Waarden zijn te overschrijven met omgevingsvariabelen.
import { join } from "node:path";

const DEFAULT_DB_PATH = join(import.meta.dirname, "..", "data", "restwell.db");

export const DB_PATH = process.env["RESTWELL_DB_PATH"] ?? DEFAULT_DB_PATH;

const DEFAULT_GRPC_PORT = 8080;

// De app praat met de Pi op deze poort. De server luistert op alle netwerkadressen.
export const GRPC_PORT = Number(process.env["RESTWELL_GRPC_PORT"] ?? DEFAULT_GRPC_PORT);

// Zet RESTWELL_FAKE_HARDWARE=1 om zonder Pi te werken: hardware/ geeft dan verzonnen waarden.
export const USE_FAKE_HARDWARE = process.env["RESTWELL_FAKE_HARDWARE"] === "1";

// Hardware: GrovePi (Dexter Industries) op de I²C-bus van de Pi. Zie src/hardware/README.md.
export const I2C_BUS_NUMBER = 1;
export const GROVEPI_I2C_ADDRESS = 0x04;
export const OLED_I2C_ADDRESS = 0x3c;

// Poortnummers zoals ze op de GrovePi staan: D2 = 2, A0 = 0, ...
export const TEMPERATURE_HUMIDITY_PORT = 2; // D2, DHT22 (witte sensor)
export const LED_PORT = 3; // D3
export const MOTION_PORT = 4; // D4
export const BUZZER_PORT = 7; // D7
export const LIGHT_PORT = 0; // A0
