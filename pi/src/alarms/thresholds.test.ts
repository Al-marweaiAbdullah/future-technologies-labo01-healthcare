import assert from "node:assert/strict";
import { test } from "node:test";
import type { ThresholdRow } from "../db/index.ts";
import { checkThreshold, isActiveAtHour } from "./thresholds.ts";
import { NIGHT_LIGHT, ROOM_ID } from "./test-data.ts";

const temperature: ThresholdRow = {
  room_id: ROOM_ID,
  sensor: "temperature",
  min_value: 18,
  max_value: 24,
  max_duration_sec: null,
  active_from_hour: null,
  active_to_hour: null,
};

test("checkThreshold: binnen de grenzen is ok, de grenzen zelf ook", () => {
  assert.equal(checkThreshold(21, temperature), "ok");
  assert.equal(checkThreshold(18, temperature), "ok");
  assert.equal(checkThreshold(24, temperature), "ok");
});

test("checkThreshold: onder het minimum of boven het maximum", () => {
  assert.equal(checkThreshold(17.9, temperature), "too_low");
  assert.equal(checkThreshold(24.1, temperature), "too_high");
});

test("checkThreshold: een grens zonder waarde wordt niet gecontroleerd", () => {
  const onlyMax = { ...temperature, min_value: null };
  assert.equal(checkThreshold(-50, onlyMax), "ok");
});

test("isActiveAtHour: zonder actieve uren geldt een regel altijd", () => {
  for (const hour of [0, 7, 12, 22, 23]) {
    assert.equal(isActiveAtHour(temperature, hour), true);
  }
});

test("isActiveAtHour: een venster over middernacht (22 tot 7)", () => {
  assert.equal(isActiveAtHour(NIGHT_LIGHT, 21), false);
  assert.equal(isActiveAtHour(NIGHT_LIGHT, 22), true);
  assert.equal(isActiveAtHour(NIGHT_LIGHT, 23), true);
  assert.equal(isActiveAtHour(NIGHT_LIGHT, 0), true);
  assert.equal(isActiveAtHour(NIGHT_LIGHT, 6), true);
  assert.equal(isActiveAtHour(NIGHT_LIGHT, 7), false); // het eind-uur telt niet mee
  assert.equal(isActiveAtHour(NIGHT_LIGHT, 12), false);
});

test("isActiveAtHour: een venster binnen dezelfde dag (8 tot 20)", () => {
  const daytime = { ...NIGHT_LIGHT, active_from_hour: 8, active_to_hour: 20 };
  assert.equal(isActiveAtHour(daytime, 7), false);
  assert.equal(isActiveAtHour(daytime, 8), true);
  assert.equal(isActiveAtHour(daytime, 19), true);
  assert.equal(isActiveAtHour(daytime, 20), false);
});
