import { describe, expect, test } from '@rstest/core';

import {
  END_STREAM_FLAG,
  EnvelopeParser,
  encodeEnvelope,
} from '../grpc/envelope.js';

const FIRST = new Uint8Array([1, 2, 3]);
const SECOND = new Uint8Array([4, 5]);

function joined(...parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

describe('envelope', () => {
  test('encodeEnvelope zet 0 als vlag en de lengte big-endian', () => {
    expect(Array.from(encodeEnvelope(FIRST))).toEqual([0, 0, 0, 0, 3, 1, 2, 3]);
  });

  test('één stuk met één envelop', () => {
    const envelopes = new EnvelopeParser().push(encodeEnvelope(FIRST));
    expect(envelopes).toHaveLength(1);
    expect(Array.from(envelopes[0]?.data ?? [])).toEqual([1, 2, 3]);
  });

  test('één stuk met twee enveloppen', () => {
    const chunk = joined(encodeEnvelope(FIRST), encodeEnvelope(SECOND));
    const envelopes = new EnvelopeParser().push(chunk);
    expect(envelopes.map((envelope) => Array.from(envelope.data))).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
  });

  test('een envelop verdeeld over twee stukken', () => {
    const bytes = encodeEnvelope(FIRST);
    const parser = new EnvelopeParser();
    expect(parser.push(bytes.slice(0, 2))).toEqual([]);
    expect(parser.push(bytes.slice(2, 6))).toEqual([]);
    const envelopes = parser.push(bytes.slice(6));
    expect(Array.from(envelopes[0]?.data ?? [])).toEqual([1, 2, 3]);
  });

  test('de vlag END_STREAM blijft behouden', () => {
    const bytes = encodeEnvelope(SECOND);
    bytes[0] = END_STREAM_FLAG;
    const envelopes = new EnvelopeParser().push(bytes);
    expect(envelopes[0]?.flags).toBe(END_STREAM_FLAG);
  });
});
