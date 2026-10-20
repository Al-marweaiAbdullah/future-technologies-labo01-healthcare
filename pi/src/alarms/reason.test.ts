import assert from "node:assert/strict";
import { test } from "node:test";
import { formatReason } from "./reason.ts";

test("formatReason gebruikt een komma en de eenheid", () => {
  assert.equal(formatReason("temperature", "too_high", 27.44), "Te warm: 27,4 °C");
  assert.equal(formatReason("humidity", "too_low", 25), "Te droog: 25 %");
});

test("formatReason toont een ruwe waarde zonder eenheid", () => {
  assert.equal(formatReason("light", "too_high", 800), "Licht te lang aan: 800");
});
