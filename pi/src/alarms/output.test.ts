import assert from "node:assert/strict";
import { test } from "node:test";
import { decideRoomOutput, DISPLAY_TEXT_OK, mostImportantAlarm, roomLevel } from "./output.ts";
import { alarm } from "./test-data.ts";

const SEC = 1000;
const STARTED_AT_MS = 0;

test("geen open alarm: groen, LED en buzzer uit, Alles OK", () => {
  assert.equal(roomLevel([]), "green");
  assert.deepEqual(decideRoomOutput([], STARTED_AT_MS), {
    led: false,
    buzzer: false,
    displayText: DISPLAY_TEXT_OK,
  });
});

test("actief alarm: rood, LED aan en reden op de OLED", () => {
  const alarms = [alarm({ reason: "Te warm: 27,4 °C" })];

  assert.equal(roomLevel(alarms), "red");
  const output = decideRoomOutput(alarms, STARTED_AT_MS + 10 * SEC);
  assert.equal(output.led, true);
  assert.equal(output.displayText, "Te warm: 27,4 °C");
});

test("buzzer pas na buzzer_after_sec zonder bevestiging", () => {
  const alarms = [alarm({ started_at_ms: STARTED_AT_MS, buzzer_after_sec: 60 })];

  assert.equal(decideRoomOutput(alarms, STARTED_AT_MS + 59 * SEC).buzzer, false);
  assert.equal(decideRoomOutput(alarms, STARTED_AT_MS + 60 * SEC).buzzer, true);
});

test("bevestigd alarm: oranje, buzzer stopt, LED en OLED blijven", () => {
  const alarms = [alarm({ status: "acknowledged", reason: "Te warm: 27,4 °C" })];

  assert.equal(roomLevel(alarms), "orange");
  assert.deepEqual(decideRoomOutput(alarms, STARTED_AT_MS + 120 * SEC), {
    led: true,
    buzzer: false,
    displayText: "Te warm: 27,4 °C",
  });
});

test("actief en bevestigd samen: rood", () => {
  const alarms = [alarm({ id: 1, status: "acknowledged" }), alarm({ id: 2, status: "active" })];
  assert.equal(roomLevel(alarms), "red");
});

test("belangrijkste alarm: actief voor bevestigd, daarna het oudste", () => {
  const acknowledgedOld = alarm({ id: 1, status: "acknowledged", started_at_ms: 0 });
  const activeNew = alarm({ id: 2, status: "active", started_at_ms: 20 * SEC });
  const activeOld = alarm({ id: 3, status: "active", started_at_ms: 10 * SEC });

  assert.equal(mostImportantAlarm([acknowledgedOld, activeNew, activeOld])?.id, 3);
});

test("opgeloste alarmen tellen niet mee", () => {
  const alarms = [alarm({ status: "resolved" })];

  assert.equal(roomLevel(alarms), "green");
  assert.equal(decideRoomOutput(alarms, STARTED_AT_MS).led, false);
});
