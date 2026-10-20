// De gRPC-client voor de hele app. Gebruik `restWell` om gewone (unary) RPC's aan te roepen,
// bv. `await restWell.listRooms({})`. Voor de live-stroom WatchRoom: zie watchRoom.ts.
import './polyfills.js';

import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';

import { RestWellService } from '../generated/restwell/v1/restwell_pb.js';
import { PI_URL } from './config.js';

// Connect gebruikt standaard globalThis.fetch, maar Lynx zet fetch niet op globalThis:
// het bestaat alleen als variabele in de scope. Daarom geven we het expliciet mee.
const lynxFetch = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, init);

const transport = createConnectTransport({
  baseUrl: PI_URL,
  fetch: lynxFetch as typeof globalThis.fetch,
});

export const restWell = createClient(RestWellService, transport);
