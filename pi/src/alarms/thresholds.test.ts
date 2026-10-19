import assert from "node:assert/strict";
import { test } from "node:test";
import type { ThresholdRow } from "../db/index.ts";
import { checkThreshold } from "./thresholds.ts";
import { ROOM_ID } from "./test-data.ts";

const temperature: ThresholdRow = {
  room_id: ROOM_ID,
  sensor: "temperature",
  min_value: 18,
  max_value: 24,
  max_duration_sec: null,
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
