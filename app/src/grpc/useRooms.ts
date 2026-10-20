// Alle kamers, één keer opgehaald bij het openen van het scherm.
// De live status per kamer komt uit useRoomLive (zie RoomRow).
import { useCallback, useEffect, useState } from '@lynx-js/react';

import type { Room } from '../generated/restwell/v1/restwell_pb.js';
import { restWell } from './client.js';
import { errorMessage } from './errors.js';

export type RoomsStatus = 'loading' | 'ready' | 'error';

export type Rooms = {
  rooms: Room[];
  status: RoomsStatus;
  error?: string;
  reload: () => void;
};

export function useRooms(): Rooms {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [status, setStatus] = useState<RoomsStatus>('loading');
  const [error, setError] = useState<string>();
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setStatus('loading');
    setError(undefined);

    restWell
      .listRooms({})
      .then((response) => {
        if (!isCurrent) return;
        setRooms(response.rooms);
        setStatus('ready');
      })
      .catch((reason: unknown) => {
        if (!isCurrent) return;
        setStatus('error');
        setError(errorMessage(reason));
      });

    return () => {
      isCurrent = false;
    };
  }, [reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { rooms, status, error, reload };
}
