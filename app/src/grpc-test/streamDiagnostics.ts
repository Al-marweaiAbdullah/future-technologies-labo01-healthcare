// Diagnose voor de testpagina: roept WatchRoom rechtstreeks aan met fetch (zonder Connect),
// om te zien of en wanneer Lynx de stukken van een stream doorgeeft.
import { PI_URL } from '../grpc/config.js';

const WATCH_ROOM_PATH = '/restwell.v1.RestWellService/WatchRoom';
const RUN_DURATION_MS = 4000;
const ENVELOPE_HEADER_BYTES = 5;

export type Variant = {
  name: string;
  init: Record<string, unknown>;
};

export const VARIANTS: Variant[] = [
  { name: 'met useStreaming', init: { lynxExtension: { useStreaming: true } } },
  { name: 'zonder useStreaming', init: {} },
];

// Connect-envelop: 1 byte vlaggen, 4 bytes lengte (big-endian), dan het bericht.
function envelope(message: string): ArrayBuffer {
  const payload = new TextEncoder().encode(message);
  const bytes = new Uint8Array(ENVELOPE_HEADER_BYTES + payload.length);
  new DataView(bytes.buffer).setUint32(1, payload.length);
  bytes.set(payload, ENVELOPE_HEADER_BYTES);
  return bytes.buffer;
}

export async function runVariant(
  variant: Variant,
  roomId: string,
  log: (line: string) => void,
): Promise<void> {
  const startMs = Date.now();
  const elapsed = () => `+${Date.now() - startMs}ms`;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), RUN_DURATION_MS);

  try {
    const response = await fetch(`${PI_URL}${WATCH_ROOM_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/connect+json',
        'Connect-Protocol-Version': '1',
      },
      body: envelope(JSON.stringify({ roomId })),
      signal: abort.signal,
      ...variant.init,
    } as RequestInit);
    log(`${elapsed()} status ${response.status}`);

    const body = response.body;
    log(
      `body: ${body === null ? 'null' : typeof body}, zelfde bij 2x lezen: ${String(body === response.body)}`,
    );
    if (!body) return;

    const reader = body.getReader();
    let chunkCount = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunkCount++;
      log(`${elapsed()} stuk ${chunkCount}: ${value.byteLength} bytes`);
    }
    log(`${elapsed()} einde stream na ${chunkCount} stukken`);
  } catch (error) {
    log(
      `${elapsed()} fout: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
