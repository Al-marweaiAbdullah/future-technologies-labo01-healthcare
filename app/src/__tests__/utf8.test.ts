import { describe, expect, test } from '@rstest/core';

import { decodeUtf8, encodeUtf8 } from '../grpc/utf8.js';

// De echte TextEncoder/TextDecoder (Node) dienen als referentie.
const SAMPLES = [
  '',
  'Kamer 101',
  '21,5 °C',
  'Temperatuur te hoog — ëéà',
  '€ 3',
  '😴 rust',
];

describe('utf8', () => {
  test.each(SAMPLES)(
    'encodeUtf8 geeft dezelfde bytes als TextEncoder: %s',
    (text) => {
      expect(Array.from(encodeUtf8(text))).toEqual(
        Array.from(new TextEncoder().encode(text)),
      );
    },
  );

  test.each(SAMPLES)('decodeUtf8 leest TextEncoder-bytes terug: %s', (text) => {
    expect(decodeUtf8(new TextEncoder().encode(text))).toBe(text);
  });
});
