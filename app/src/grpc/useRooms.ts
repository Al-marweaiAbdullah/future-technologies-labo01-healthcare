// Alle kamers met hun aantal open alarmen, één keer opgehaald bij het openen van het scherm.
import { useCallback, useEffect, useState } from '@lynx-js/react';

import type { Room } from '../generated/restwell/v1/restwell_pb.js';
import { restWell } from './client.js';
import { errorMessage } from './errors.js';

export type RoomSummary = {
  room: Room;
  openAlarmCount: number;
};

export type RoomsStatus = 'loading' | 'ready' | 'error';

export type Rooms = {
  rooms: RoomSummary[];
  status: RoomsStatus;
  error?: string;
  reload: () => void;
};

async function fetchRoomSummaries(): Promise<RoomSummary[]> {
  const { rooms } = await restWell.listRooms({});
  return Promise.all(
    rooms.map(async (room) => {
      const { alarms } = await restWell.listOpenAlarms({ roomId: room.id });
      return { room, openAlarmCount: alarms.length };
    }),
  );
}

export function useRooms(): Rooms {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [status, setStatus] = useState<RoomsStatus>('loading');
  const [error, setError] = useState<string>();
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setStatus('loading');
    setError(undefined);

    fetchRoomSummaries()
      .then((summaries) => {
        if (!isCurrent) return;
        setRooms(summaries);
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
