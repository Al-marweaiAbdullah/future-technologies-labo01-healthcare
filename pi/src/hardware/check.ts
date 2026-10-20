// Leest alle sensoren elke paar seconden uit en toont ze in de terminal en op de OLED.
// Om de bedrading te controleren, los van de rest van RestWell. Uitvoeren met: npm run hardware:check
import { openHardware, readAllSensors, type SensorReadings } from "./index.ts";

// De DHT22 kan hoogstens om de 2 seconden een nieuwe meting geven.
const READ_INTERVAL_MS = 2000;

function format(value: number | null, unit: string): string {
  return value === null ? "-" : `${value}${unit}`;
}

function toLines(readings: SensorReadings): string[] {
  const motion = readings.motionDetected === null ? "-" : readings.motionDetected ? "ja" : "nee";
  return [
    `Temp:    ${format(readings.temperatureC, " C")}`,
    `Vocht:   ${format(readings.humidityPercent, " %")}`,
    `Licht:   ${format(readings.lightRaw, "")}`,
    `Beweging: ${motion}`,
  ];
}

const hardware = await openHardware();

async function readAndShow(): Promise<void> {
  const lines = toLines(await readAllSensors(hardware));
  console.log(lines.join(" | "));
  await hardware.showOnDisplay(lines);
}

const timer = setInterval(() => {
  readAndShow().catch((error: unknown) => console.error("Uitlezen mislukt:", error));
}, READ_INTERVAL_MS);

process.on("SIGINT", () => {
  clearInterval(timer);
  hardware
    .close()
    .catch((error: unknown) => console.error("Hardware afsluiten mislukt:", error))
    .finally(() => process.exit());
});

console.log(`Sensoren uitlezen elke ${READ_INTERVAL_MS} ms. Stoppen met Ctrl+C.`);
