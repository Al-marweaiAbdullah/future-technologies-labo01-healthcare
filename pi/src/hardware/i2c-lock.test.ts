import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { createI2cLock } from "./i2c-lock.ts";

test("taken lopen één voor één, ook als de eerste trager is", async () => {
  const lock = createI2cLock();
  const order: string[] = [];
  await Promise.all([
    lock(async () => {
      order.push("a start");
      await sleep(20);
      order.push("a einde");
    }),
    lock(async () => {
      order.push("b start");
    }),
  ]);
  assert.deepEqual(order, ["a start", "a einde", "b start"]);
});

test("een mislukte taak geeft haar fout door en blokkeert de volgende niet", async () => {
  const lock = createI2cLock();
  const failing = lock(async () => {
    throw new Error("bus fout");
  });
  const next = lock(async () => "ok");
  await assert.rejects(failing, /bus fout/);
  assert.equal(await next, "ok");
});
