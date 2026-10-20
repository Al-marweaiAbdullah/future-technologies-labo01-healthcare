// Live gegevens van één kamer: haalt de open alarmen op en luistert dan mee via WatchRoom.
// Valt de verbinding weg (wifi, Pi herstart), dan verbindt de hook na even wachten opnieuw.
// De verbinding sluit vanzelf als het scherm verdwijnt.
import { useEffect, useState } from '@lynx-js/react';

import { restWell } from './client.js';
import {
  INITIAL_ROOM_STATE,
  applyRoomEvent,
  withOpenAlarms,
  type RoomState,
} from './roomState.js';
import { watchRoom } from './watchRoom.js';

const RECONNECT_DELAY_MS = 3000;

export type RoomLiveStatus = 'connecting' | 'live' | 'closed' | 'error';

export type RoomLive = RoomState & {
  status: RoomLiveStatus;
  error?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function useRoomLive(roomId: string): RoomLive {
  const [room, setRoom] = useState<RoomState>(INITIAL_ROOM_STATE);
  const [status, setStatus] = useState<RoomLiveStatus>('connecting');
  const [error, setError] = useState<string>();

  useEffect(() => {
    setRoom(INITIAL_ROOM_STATE);
    setStatus('connecting');
    setError(undefined);

    if (typeof AbortController === 'undefined') {
      setStatus('error');
      setError('AbortController ontbreekt in deze Lynx-versie');
      return;
    }
    const abort = new AbortController();
    const signal = abort.signal;

    async function listenOnce(): Promise<void> {
      const { alarms } = await restWell.listOpenAlarms({ roomId }, { signal });
      setRoom((current) => withOpenAlarms(current, alarms));

      for await (const response of watchRoom(roomId, signal)) {
        setStatus('live');
        setError(undefined);
        setRoom((current) => applyRoomEvent(current, response.event));
      }
    }

    async function listen(): Promise<void> {
      while (!signal.aborted) {
        try {
          await listenOnce();
          if (!signal.aborted) setStatus('closed'); // de Pi sloot de stroom
        } catch (reason) {
          if (signal.aborted) return; // het scherm is weg, dat is geen fout
          setStatus('error');
          setError(errorMessage(reason));
        }
        await wait(RECONNECT_DELAY_MS, signal);
      }
    }

    void listen();
    return () => abort.abort();
  }, [roomId]);

  return { ...room, status, error };
}
