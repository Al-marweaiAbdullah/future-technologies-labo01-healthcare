import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMMAND,
  decodeAnalog,
  decodeDht,
  decodeDigital,
  encodeCommand,
  encodeDhtRead,
} from "./grovepi-protocol.ts";

function dhtResponse(temperatureC: number, humidityPercent: number): Buffer {
  const response = Buffer.alloc(9);
  response.writeFloatLE(temperatureC, 1);
  response.writeFloatLE(humidityPercent, 5);
  return response;
}

test("commando: altijd 4 bytes, aangevuld met nullen", () => {
  assert.deepEqual([...encodeCommand(COMMAND.analogRead, 0)], [3, 0, 0, 0]);
  assert.deepEqual([...encodeCommand(COMMAND.digitalWrite, 7, 1)], [2, 7, 1, 0]);
});

test("DHT-commando vraagt een DHT22 (type 1)", () => {
  assert.deepEqual([...encodeDhtRead(2)], [40, 2, 1, 0]);
});

test("digitaal: 0 en 1 worden false en true", () => {
  assert.equal(decodeDigital(Buffer.from([0])), false);
  assert.equal(decodeDigital(Buffer.from([1])), true);
});

test("digitaal: andere waarde is een fout", () => {
  assert.throws(() => decodeDigital(Buffer.from([255])), /ongeldige digitale waarde/);
});

test("analoog: hoge en lage byte samen", () => {
  // Echte uitlezing van de lichtsensor tijdens het testen: [0, 2, 251] = 763
  assert.equal(decodeAnalog(Buffer.from([0, 2, 251])), 763);
});

test("analoog: boven 1023 is een fout", () => {
  assert.throws(() => decodeAnalog(Buffer.from([0, 255, 255])), /ongeldige analoge waarde/);
});

test("analoog: te kort antwoord is een fout", () => {
  assert.throws(() => decodeAnalog(Buffer.from([0, 2])), /3 verwacht/);
});

test("DHT: temperatuur en vochtigheid, afgerond op 0,1", () => {
  // Echte bytes van de DHT22 tijdens het testen
  const response = Buffer.from([0, 51, 51, 171, 65, 154, 153, 81, 66]);
  assert.deepEqual(decodeDht(response), { temperatureC: 21.4, humidityPercent: 52.4 });
});

test("DHT: NaN betekent een mislukte meting", () => {
  assert.throws(() => decodeDht(dhtResponse(NaN, NaN)), /ongeldige meting/);
});

test("DHT: waarde buiten het meetbereik is een fout", () => {
  assert.throws(() => decodeDht(dhtResponse(21, 120)), /ongeldige meting/);
  assert.throws(() => decodeDht(dhtResponse(-50, 40)), /ongeldige meting/);
});
