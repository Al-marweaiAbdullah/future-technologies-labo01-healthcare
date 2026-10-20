// Lynx heeft geen (volledige) TextEncoder en TextDecoder, maar Connect en protobuf hebben ze nodig.
// Op de background thread biedt Lynx TextCodecHelper (snel, native). Op de main thread bestaat dat
// niet; daar gebruiken we de omzetting in gewoon JavaScript uit utf8.ts.
//
// Importeer dit bestand als EERSTE import in elke entry (src/index.tsx, src/grpc-test/index.tsx).
// protobuf-es heeft TextDecoder al nodig zodra een gegenereerd *_pb.js-bestand geladen wordt,
// en imports worden in volgorde uitgevoerd vóór de code van een bestand.
import { decodeUtf8, encodeUtf8 } from './utf8.js';

function toUint8Array(input: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const end = bytes.byteOffset + bytes.byteLength;
  return bytes.buffer.slice(bytes.byteOffset, end) as ArrayBuffer;
}

const hasTextCodecHelper = typeof TextCodecHelper !== 'undefined';

class LynxTextEncoder {
  readonly encoding = 'utf-8';

  encode(input = ''): Uint8Array {
    if (hasTextCodecHelper)
      return new Uint8Array(TextCodecHelper.encode(input));
    return encodeUtf8(input);
  }
}

class LynxTextDecoder {
  readonly encoding = 'utf-8';

  decode(input?: ArrayBuffer | ArrayBufferView): string {
    if (!input) return '';
    const bytes = toUint8Array(input);
    if (hasTextCodecHelper) return TextCodecHelper.decode(toArrayBuffer(bytes));
    return decodeUtf8(bytes);
  }
}

// In tests en in de browser bestaan de echte klassen al; die laten we staan.
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = LynxTextEncoder as unknown as typeof TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = LynxTextDecoder as unknown as typeof TextDecoder;
}

export {};
