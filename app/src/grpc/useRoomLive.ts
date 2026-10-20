// Live gegevens van één kamer: haalt de open alarmen op en luistert dan mee via WatchRoom.
// De verbinding sluit vanzelf als het scherm verdwijnt.
import { useEffect, useState } from '@lynx-js/react';

import { restWell } from './client.js';
import {
  INITIAL_ROOM_STATE,
  applyRoomEvent,
  withOpenAlarms,
  type RoomState,
} from './roomState.js';

export type RoomLiveStatus = 'connecting' | 'live' | 'closed' | 'error';

export type RoomLive = RoomState & {
  status: RoomLiveStatus;
  error?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

    async function listen(): Promise<void> {
      const { alarms } = await restWell.listOpenAlarms({ roomId }, { signal });
      setRoom((current) => withOpenAlarms(current, alarms));

      for await (const response of restWell.watchRoom({ roomId }, { signal })) {
        setStatus('live');
        setRoom((current) => applyRoomEvent(current, response.event));
      }
      setStatus('closed'); // de server sloot de stroom
    }

    listen().catch((reason: unknown) => {
      if (signal.aborted) return; // het scherm is weg, dat is geen fout
      setStatus('error');
      setError(errorMessage(reason));
    });

    return () => abort.abort();
  }, [roomId]);

  return { ...room, status, error };
}
