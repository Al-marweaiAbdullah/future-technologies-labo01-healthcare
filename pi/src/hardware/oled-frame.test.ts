import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DISPLAY_HEIGHT_PX,
  DISPLAY_MAX_CHARS_PER_LINE,
  DISPLAY_MAX_LINES,
  DISPLAY_WIDTH_PX,
  FRAME_BYTES,
  packFrame,
  renderLines,
  wrapForDisplay,
} from "./oled-frame.ts";

function countOn(pixels: boolean[][]): number {
  return pixels.flat().filter(Boolean).length;
}

function emptyPixels(): boolean[][] {
  return Array.from({ length: DISPLAY_HEIGHT_PX }, () =>
    new Array<boolean>(DISPLAY_WIDTH_PX).fill(false),
  );
}

test("96×96 scherm: 12 regels van 16 tekens", () => {
  assert.equal(DISPLAY_MAX_LINES, 12);
  assert.equal(DISPLAY_MAX_CHARS_PER_LINE, 16);
});

test("geen tekst: alle pixels uit", () => {
  assert.equal(countOn(renderLines([])), 0);
});

test("'!' tekent een verticaal streepje in kolom 2 van de eerste letter", () => {
  const pixels = renderLines(["!"]);
  // In het lettertype is '!' 0x5F in kolom 2: rijen 0-4 en 6 aan, rij 5 uit.
  const column2 = pixels.slice(0, 7).map((row) => row[2]);
  assert.deepEqual(column2, [true, true, true, true, true, false, true]);
  assert.equal(countOn(pixels), 6);
});

test("tweede regel begint 8 pixels lager", () => {
  const pixels = renderLines(["", "!"]);
  assert.equal(pixels[8]?.[2], true);
  assert.equal(pixels[0]?.[2], false);
});

test("te lange regel en te veel regels worden afgeknipt, niet afgebroken", () => {
  const longLine = "#".repeat(DISPLAY_MAX_CHARS_PER_LINE + 5);
  const tooMany = new Array<string>(DISPLAY_MAX_LINES + 3).fill(longLine);
  assert.deepEqual(renderLines(tooMany), renderLines(tooMany.slice(0, DISPLAY_MAX_LINES)));
  assert.deepEqual(renderLines([longLine]), renderLines(["#".repeat(DISPLAY_MAX_CHARS_PER_LINE)]));
});

test("letters met accent worden gewone letters", () => {
  assert.deepEqual(renderLines(["Vochtigheid é"]), renderLines(["Vochtigheid e"]));
});

test("frame: 2 pixels per byte, gespiegeld en omgedraaid zodat linksboven ook linksboven staat", () => {
  const pixels = emptyPixels();
  const firstRow = pixels[0];
  assert.ok(firstRow);
  firstRow[0] = true; // pixel linksboven
  const frame = packFrame(pixels);

  assert.equal(frame.length, FRAME_BYTES);
  // Pixel linksboven komt in de allerlaatste byte van het frame, in de lage helft.
  assert.equal(frame[FRAME_BYTES - 1], 0x0f);
  assert.equal(frame.filter((byte) => byte !== 0).length, 1);
});

test("wrapForDisplay: korte tekst blijft één regel", () => {
  assert.deepEqual(wrapForDisplay("Alles OK"), ["Alles OK"]);
});

test("wrapForDisplay: lange tekst breekt tussen woorden", () => {
  assert.deepEqual(wrapForDisplay("Licht te lang aan: 950"), ["Licht te lang", "aan: 950"]);
});

test("wrapForDisplay: een te lang woord wordt geknipt", () => {
  assert.deepEqual(wrapForDisplay("Luchtvochtigheidsmeter"), ["Luchtvochtigheid", "smeter"]);
});

test("wrapForDisplay: lege tekst geeft geen regels", () => {
  assert.deepEqual(wrapForDisplay("  "), []);
});
