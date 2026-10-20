// Metingen van een kamer over een periode, voor de grafiek en de historiek.
// Haalt de periode één keer op met ListReadings en vult ze daarna aan met de live metingen
// uit WatchRoom (via `liveReading`), zodat de grafiek meeloopt zonder opnieuw op te vragen.
import { useEffect, useState } from '@lynx-js/react';

import type { Reading } from '../generated/restwell/v1/restwell_pb.js';
import { appendReading } from '../format/history.js';
import { restWell } from './client.js';
import { errorMessage } from './errors.js';

export type HistoryStatus = 'loading' | 'ready' | 'error';

export type ReadingHistory = {
  readings: Reading[];
  /** Einde van de periode: net na de laatste meting, of het moment van ophalen. */
  endMs: number;
  status: HistoryStatus;
  error?: string;
};

export function useReadingHistory(
  roomId: string,
  windowMs: number,
  liveReading?: Reading,
): ReadingHistory {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [status, setStatus] = useState<HistoryStatus>('loading');
  const [error, setError] = useState<string>();
  const [requestedAtMs, setRequestedAtMs] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setStatus('loading');
    setError(undefined);
    const nowMs = Date.now();
    setRequestedAtMs(nowMs);
    const sinceMs = BigInt(nowMs - windowMs);

    restWell
      .listReadings({ roomId, sinceMs })
      .then((response) => {
        if (!isCurrent) return;
        setReadings(response.readings);
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
  }, [roomId, windowMs]);

  useEffect(() => {
    if (!liveReading) return;
    setReadings((current) => appendReading(current, liveReading, windowMs));
  }, [liveReading, windowMs]);

  const latest = readings[readings.length - 1];
  const endMs = latest ? Number(latest.timestampMs) + 1 : requestedAtMs;
  return { readings, endMs, status, error };
}
