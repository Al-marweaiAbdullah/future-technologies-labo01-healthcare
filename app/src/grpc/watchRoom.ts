// WatchRoom (server-stream) zonder de stream-laag van Connect, die in Lynx blijft hangen
// (zie envelope.ts). Het verzoek en de berichten zijn gewoon de types uit /proto.
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import {
  RestWellService,
  WatchRoomRequestSchema,
  WatchRoomResponseSchema,
  type WatchRoomResponse,
} from '../generated/restwell/v1/restwell_pb.js';
import { PI_URL } from './config.js';
import { END_STREAM_FLAG, EnvelopeParser, encodeEnvelope } from './envelope.js';

const WATCH_ROOM_URL = `${PI_URL}/${RestWellService.typeName}/${RestWellService.method.watchRoom.name}`;

const CONNECT_HEADERS = {
  'Content-Type': 'application/connect+proto',
  'Connect-Protocol-Version': '1',
};

// Lynx geeft de stukken als ArrayBuffer, niet als Uint8Array.
function toUint8Array(chunk: unknown): Uint8Array {
  if (chunk instanceof Uint8Array) return chunk;
  if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk);
  if (ArrayBuffer.isView(chunk)) {
    return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  }
  throw new TypeError(`onverwacht stuk in de stream: ${typeof chunk}`);
}

type EndStream = { error?: { code?: string; message?: string } };

// Het laatste bericht van een Connect-stream is JSON; bij een fout staat die erin.
function throwIfEndStreamError(data: Uint8Array): void {
  if (data.length === 0) return;
  const endStream = JSON.parse(new TextDecoder().decode(data)) as EndStream;
  if (endStream.error) {
    const { code = 'unknown', message = '' } = endStream.error;
    throw new Error(`WatchRoom: [${code}] ${message}`);
  }
}

/**
 * Luistert live naar een kamer: eerst de laatste meting, daarna elke nieuwe meting en
 * alarmwijziging. Stopt als `signal` afgebroken wordt of de Pi de stroom sluit.
 */
export async function* watchRoom(
  roomId: string,
  signal: AbortSignal,
): AsyncGenerator<WatchRoomResponse> {
  const request = toBinary(
    WatchRoomRequestSchema,
    create(WatchRoomRequestSchema, { roomId }),
  );
  const requestBytes = encodeEnvelope(request);
  const response = await fetch(WATCH_ROOM_URL, {
    method: 'POST',
    headers: CONNECT_HEADERS,
    body: requestBytes.buffer as ArrayBuffer,
    signal,
  });
  if (!response.ok) {
    throw new Error(`WatchRoom: HTTP ${response.status}`);
  }

  // Lynx laat response.body maar één keer lezen; een tweede keer geeft "body used".
  const body = response.body;
  if (!body) throw new Error('WatchRoom: geen body in het antwoord');

  const reader = body.getReader();
  // Lynx breekt een wachtende read() niet af via fetch, dus annuleren we de reader zelf.
  const cancel = () => {
    reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', cancel);

  const parser = new EnvelopeParser();
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) return;
      for (const envelope of parser.push(toUint8Array(value))) {
        if (envelope.flags & END_STREAM_FLAG) {
          throwIfEndStreamError(envelope.data);
          return;
        }
        yield fromBinary(WatchRoomResponseSchema, envelope.data);
      }
    }
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
