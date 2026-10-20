import type { Hardware, SensorReadings } from "./types.ts";

async function readOrNull<T>(sensor: string, read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    // Een sensor die uitvalt mag de andere metingen niet tegenhouden.
    console.error(`Sensor "${sensor}" uitlezen mislukt:`, error);
    return null;
  }
}

// Leest alle sensoren één keer uit. Een sensor die faalt, geeft `null` in plaats van een fout.
export async function readAllSensors(hardware: Hardware): Promise<SensorReadings> {
  const climate = await readOrNull("temperatuur/luchtvochtigheid", () =>
    hardware.readTemperatureHumidity(),
  );
  const lightRaw = await readOrNull("licht", () => hardware.readLightRaw());
  const motionDetected = await readOrNull("beweging", () => hardware.readMotionDetected());
  return {
    temperatureC: climate?.temperatureC ?? null,
    humidityPercent: climate?.humidityPercent ?? null,
    lightRaw,
    motionDetected,
  };
}
