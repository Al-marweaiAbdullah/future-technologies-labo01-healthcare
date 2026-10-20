// Het Connect-streamformaat: elk bericht is een "envelop" van 1 byte vlaggen, 4 bytes lengte
// (big-endian) en dan het bericht zelf. Het laatste bericht heeft de vlag END_STREAM en bevat
// JSON met eventueel een fout. Zie https://connectrpc.com/docs/protocol#streaming-rpcs
//
// We lezen streams zelf, omdat Connect intern `new ReadableStream({ pull })` gebruikt en dat in
// Lynx nooit `pull` aanroept (gemeten met de diagnose op de testpagina).

export const END_STREAM_FLAG = 0b0000_0010;
const HEADER_BYTES = 5;

export type Envelope = {
  flags: number;
  data: Uint8Array;
};

export function encodeEnvelope(data: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(HEADER_BYTES + data.length);
  new DataView(bytes.buffer).setUint32(1, data.length);
  bytes.set(data, HEADER_BYTES);
  return bytes;
}

function concat(first: Uint8Array, second: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(first.length + second.length);
  bytes.set(first, 0);
  bytes.set(second, first.length);
  return bytes;
}

/**
 * Knipt binnenkomende stukken in enveloppen. Een stuk kan een halve envelop bevatten of
 * meerdere; wat nog niet compleet is, blijft bewaard tot het volgende stuk.
 */
export class EnvelopeParser {
  private pending: Uint8Array = new Uint8Array(0);

  push(chunk: Uint8Array): Envelope[] {
    this.pending = concat(this.pending, chunk);
    const envelopes: Envelope[] = [];

    while (this.pending.length >= HEADER_BYTES) {
      const view = new DataView(
        this.pending.buffer,
        this.pending.byteOffset,
        this.pending.byteLength,
      );
      const length = view.getUint32(1);
      const end = HEADER_BYTES + length;
      if (this.pending.length < end) break;

      envelopes.push({
        flags: this.pending[0] ?? 0,
        data: this.pending.slice(HEADER_BYTES, end),
      });
      this.pending = this.pending.slice(end);
    }
    return envelopes;
  }
}
