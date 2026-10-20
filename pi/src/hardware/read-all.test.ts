import assert from "node:assert/strict";
import { test } from "node:test";
import { createFakeHardware } from "./fake.ts";
import { readAllSensors } from "./read-all.ts";

test("alle sensoren werken: elke waarde is ingevuld", async () => {
  const readings = await readAllSensors(createFakeHardware());

  assert.equal(typeof readings.temperatureC, "number");
  assert.equal(typeof readings.humidityPercent, "number");
  assert.equal(typeof readings.lightRaw, "number");
  assert.equal(typeof readings.motionDetected, "boolean");
});

test("één sensor valt uit: die wordt null, de andere blijven", async (t) => {
  t.mock.method(console, "error", () => undefined);
  const hardware = createFakeHardware();
  hardware.readTemperatureHumidity = async () => {
    throw new Error("DHT22 antwoordt niet");
  };
  hardware.readLightRaw = async () => 512;
  hardware.readMotionDetected = async () => true;

  const readings = await readAllSensors(hardware);

  assert.deepEqual(readings, {
    temperatureC: null,
    humidityPercent: null,
    lightRaw: 512,
    motionDetected: true,
  });
});
