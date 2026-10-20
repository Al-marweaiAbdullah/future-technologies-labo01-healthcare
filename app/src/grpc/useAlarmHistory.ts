// Alarmgeschiedenis van een kamer via ListAlarms: ook opgeloste en geziene alarmen.
// Wordt opnieuw opgehaald als `refreshKey` verandert (zie alarmHistoryKey): dat gebeurt
// alleen bij een alarmwijziging uit de live-stroom, dus zonder polling.
import { useEffect, useState } from '@lynx-js/react';

import type { Alarm } from '../generated/restwell/v1/restwell_pb.js';
import { restWell } from './client.js';
import { errorMessage } from './errors.js';

export type AlarmHistoryStatus = 'loading' | 'ready' | 'error';

export type AlarmHistory = {
  /** Nieuwste eerst, zoals ListAlarms ze geeft. */
  alarms: Alarm[];
  status: AlarmHistoryStatus;
  error?: string;
};

export function useAlarmHistory(
  roomId: string,
  windowMs: number,
  refreshKey: string,
): AlarmHistory {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [status, setStatus] = useState<AlarmHistoryStatus>('loading');
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isCurrent = true;
    setError(undefined);
    const sinceMs = BigInt(Date.now() - windowMs);

    restWell
      .listAlarms({ roomId, sinceMs })
      .then((response) => {
        if (!isCurrent) return;
        setAlarms(response.alarms);
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
  }, [roomId, windowMs, refreshKey]);

  return { alarms, status, error };
}
