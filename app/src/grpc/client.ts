// De gRPC-client voor de hele app. Gebruik `restWell` om RPC's uit het contract aan te roepen.
import './polyfills.js';

import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';

import { RestWellService } from '../generated/restwell/v1/restwell_pb.js';
import { PI_URL } from './config.js';

const transport = createConnectTransport({ baseUrl: PI_URL });

export const restWell = createClient(RestWellService, transport);
