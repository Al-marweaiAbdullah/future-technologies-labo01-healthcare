// De gRPC-client voor de hele app. Gebruik `restWell` om RPC's uit het contract aan te roepen.
import './polyfills.js';

import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';

import { RestWellService } from '../generated/restwell/v1/restwell_pb.js';
import { PI_URL } from './config.js';

// Streaming-RPC's (zoals WatchRoom) sturen dit content-type; gewone RPC's `application/proto`.
const CONNECT_STREAMING_CONTENT_TYPE_PREFIX = 'application/connect+';

// De Lynx-uitbreiding op RequestInit (zie @lynx-js/types, background-thread/fetch.d.ts).
type LynxRequestInit = RequestInit & {
  lynxExtension?: { useStreaming?: boolean };
};

function isStreamingRequest(init?: RequestInit): boolean {
  const contentType = new Headers(init?.headers).get('content-type') ?? '';
  return contentType.startsWith(CONNECT_STREAMING_CONTENT_TYPE_PREFIX);
}

// Connect gebruikt standaard globalThis.fetch, maar Lynx zet fetch niet op globalThis:
// het bestaat alleen als variabele in de scope. Daarom geven we het expliciet mee.
// Lynx leest de body bovendien in één keer, tenzij je `lynxExtension.useStreaming` meegeeft;
// zonder die optie faalt een stream met "body used".
async function lynxFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!isStreamingRequest(init)) return fetch(input, init);
  const streamingInit: LynxRequestInit = {
    ...init,
    lynxExtension: { useStreaming: true },
  };
  const response = await fetch(input, streamingInit);
  return withBodyReadOnce(response);
}

// In Lynx geeft elke keer dat je `response.body` leest een nieuwe stream, en daarna is de body
// "used". Connect leest `body` twee keer (eerst een null-check), dus bewaren we de eerste.
function withBodyReadOnce(response: Response): Response {
  const body = response.body;
  return new Proxy(response, {
    get(target, property) {
      if (property === 'body') return body;
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

const transport = createConnectTransport({
  baseUrl: PI_URL,
  fetch: lynxFetch as typeof globalThis.fetch,
});

export const restWell = createClient(RestWellService, transport);
