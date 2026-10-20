// UTF-8 omzetten in gewoon JavaScript, voor waar Lynx geen TextCodecHelper heeft (de main thread).
// Lynx rendert componenten op twee threads; op de main thread laadt protobuf ook de gegenereerde code,
// en daar heeft het TextDecoder nodig om de beschrijving van het contract te lezen.

const ONE_BYTE_MAX = 0x7f;
const TWO_BYTES_MAX = 0x7ff;
const THREE_BYTES_MAX = 0xffff;
const CONTINUATION_PREFIX = 0x80;
const CONTINUATION_MASK = 0x3f;

export function encodeUtf8(input: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of input) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint <= ONE_BYTE_MAX) {
      bytes.push(codePoint);
    } else if (codePoint <= TWO_BYTES_MAX) {
      bytes.push(
        0xc0 | (codePoint >> 6),
        CONTINUATION_PREFIX | (codePoint & CONTINUATION_MASK),
      );
    } else if (codePoint <= THREE_BYTES_MAX) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        CONTINUATION_PREFIX | ((codePoint >> 6) & CONTINUATION_MASK),
        CONTINUATION_PREFIX | (codePoint & CONTINUATION_MASK),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        CONTINUATION_PREFIX | ((codePoint >> 12) & CONTINUATION_MASK),
        CONTINUATION_PREFIX | ((codePoint >> 6) & CONTINUATION_MASK),
        CONTINUATION_PREFIX | (codePoint & CONTINUATION_MASK),
      );
    }
  }
  return new Uint8Array(bytes);
}

export function decodeUtf8(bytes: Uint8Array): string {
  let result = '';
  let index = 0;
  const next = (): number => (bytes[index++] ?? 0) & CONTINUATION_MASK;

  while (index < bytes.length) {
    const first = bytes[index++] ?? 0;
    let codePoint: number;
    if (first < 0x80) {
      codePoint = first;
    } else if (first < 0xe0) {
      codePoint = ((first & 0x1f) << 6) | next();
    } else if (first < 0xf0) {
      codePoint = ((first & 0x0f) << 12) | (next() << 6) | next();
    } else {
      codePoint =
        ((first & 0x07) << 18) | (next() << 12) | (next() << 6) | next();
    }
    result += String.fromCodePoint(codePoint);
  }
  return result;
}
