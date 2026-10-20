// Zet tekstregels om naar een beeld voor de Grove OLED 96×96 (SSD1327).
// Pure functies zonder hardware, zodat ze te testen zijn.
import font from "oled-font-5x7";

export const DISPLAY_WIDTH_PX = 96;
export const DISPLAY_HEIGHT_PX = 96;

const CHAR_SPACING_PX = 1;
const LINE_SPACING_PX = 1;
const CHAR_WIDTH_PX = font.width + CHAR_SPACING_PX;
const LINE_HEIGHT_PX = font.height + LINE_SPACING_PX;

export const DISPLAY_MAX_LINES = Math.floor(DISPLAY_HEIGHT_PX / LINE_HEIGHT_PX); // 12
export const DISPLAY_MAX_CHARS_PER_LINE = Math.floor(DISPLAY_WIDTH_PX / CHAR_WIDTH_PX); // 16

// De SSD1327 kent 16 grijstinten per pixel; tekst tonen we op volle helderheid.
const PIXEL_ON = 0x0f;
const PIXELS_PER_BYTE = 2;
export const FRAME_BYTES = (DISPLAY_WIDTH_PX * DISPLAY_HEIGHT_PX) / PIXELS_PER_BYTE;

const UNKNOWN_CHAR = "?";

// Het lettertype bevat alleen ASCII. Letters met accenten worden gewone letters (é → e).
function toFontChars(text: string): string[] {
  return [...text.normalize("NFD").replace(/[̀-ͯ]/g, "")].map((char) =>
    font.lookup.includes(char) ? char : UNKNOWN_CHAR,
  );
}

// Per pixel aan (true) of uit, rij per rij. Te lange regels en te veel regels worden afgeknipt.
export function renderLines(lines: string[]): boolean[][] {
  const pixels = Array.from({ length: DISPLAY_HEIGHT_PX }, () =>
    new Array<boolean>(DISPLAY_WIDTH_PX).fill(false),
  );
  lines.slice(0, DISPLAY_MAX_LINES).forEach((line, lineIndex) => {
    const chars = toFontChars(line).slice(0, DISPLAY_MAX_CHARS_PER_LINE);
    chars.forEach((char, charIndex) => {
      const glyphStart = font.lookup.indexOf(char) * font.width;
      // Elke byte in het lettertype is één kolom van de letter, bit 0 bovenaan.
      for (let column = 0; column < font.width; column++) {
        const columnBits = font.fontData[glyphStart + column] ?? 0;
        for (let row = 0; row < font.height; row++) {
          if ((columnBits >> row) & 1) {
            const y = lineIndex * LINE_HEIGHT_PX + row;
            const x = charIndex * CHAR_WIDTH_PX + column;
            const pixelRow = pixels[y];
            if (pixelRow) pixelRow[x] = true;
          }
        }
      }
    });
  });
  return pixels;
}

// Met onze remap-instelling (zie oled.ts) staat het beeld op de Grove OLED gespiegeld en
// ondersteboven. Vastgesteld door te testen op het echte scherm.
const FLIP_HORIZONTAL = true;
const FLIP_VERTICAL = true;

function sourcePixel(pixels: boolean[][], x: number, y: number): boolean {
  const sourceX = FLIP_HORIZONTAL ? DISPLAY_WIDTH_PX - 1 - x : x;
  const sourceY = FLIP_VERTICAL ? DISPLAY_HEIGHT_PX - 1 - y : y;
  return pixels[sourceY]?.[sourceX] ?? false;
}

// Pakt de pixels in zoals de SSD1327 ze verwacht: 2 pixels per byte, rij per rij.
export function packFrame(pixels: boolean[][]): Buffer {
  const frame = Buffer.alloc(FRAME_BYTES);
  for (let y = 0; y < DISPLAY_HEIGHT_PX; y++) {
    for (let x = 0; x < DISPLAY_WIDTH_PX; x += PIXELS_PER_BYTE) {
      const first = sourcePixel(pixels, x, y) ? PIXEL_ON : 0;
      const second = sourcePixel(pixels, x + 1, y) ? PIXEL_ON : 0;
      frame[(y * DISPLAY_WIDTH_PX + x) / PIXELS_PER_BYTE] = (first << 4) | second;
    }
  }
  return frame;
}
