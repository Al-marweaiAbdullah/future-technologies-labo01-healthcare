// Lynx heeft geen (volledige) TextEncoder en TextDecoder, maar Connect en protobuf hebben ze nodig.
// Lynx biedt wel TextCodecHelper (UTF-8 tussen string en ArrayBuffer); deze klassen bouwen daarop.

function toArrayBuffer(input: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (input instanceof ArrayBuffer) return input;
  const end = input.byteOffset + input.byteLength;
  return input.buffer.slice(input.byteOffset, end) as ArrayBuffer;
}

class LynxTextEncoder {
  readonly encoding = 'utf-8';

  encode(input = ''): Uint8Array {
    return new Uint8Array(TextCodecHelper.encode(input));
  }
}

class LynxTextDecoder {
  readonly encoding = 'utf-8';

  decode(input?: ArrayBuffer | ArrayBufferView): string {
    if (!input) return '';
    return TextCodecHelper.decode(toArrayBuffer(input));
  }
}

// TextCodecHelper bestaat alleen in Lynx; in tests en in de browser blijven de echte klassen staan.
if (typeof TextCodecHelper !== 'undefined') {
  if (typeof globalThis.TextEncoder === 'undefined') {
    globalThis.TextEncoder = LynxTextEncoder as unknown as typeof TextEncoder;
  }
  if (typeof globalThis.TextDecoder === 'undefined') {
    globalThis.TextDecoder = LynxTextDecoder as unknown as typeof TextDecoder;
  }
}

export {};
