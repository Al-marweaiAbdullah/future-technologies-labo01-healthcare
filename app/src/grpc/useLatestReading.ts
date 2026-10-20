// De laatste meting van een kamer, één keer opgehaald bij het openen van het scherm.
// Nodig zolang de live-stroom (WatchRoom) in Lynx niet werkt: zo toont het scherm toch iets.
import { useEffect, useState } from '@lynx-js/react';

import type { Reading } from '../generated/restwell/v1/restwell_pb.js';
import { restWell } from './client.js';

const LOOKBACK_MS = 10 * 60 * 1000;

export function useLatestReading(roomId: string): Reading | undefined {
  const [reading, setReading] = useState<Reading>();

  useEffect(() => {
    let isCurrent = true;
    setReading(undefined);
    const sinceMs = BigInt(Date.now() - LOOKBACK_MS);

    restWell
      .listReadings({ roomId, sinceMs })
      .then(({ readings }) => {
        // Oudste eerst, dus de laatste is de nieuwste.
        if (isCurrent) setReading(readings[readings.length - 1]);
      })
      .catch((error: unknown) => {
        // Geen ramp: de live-stroom of een volgende keer openen kan het nog tonen.
        console.warn('ListReadings mislukt', error);
      });

    return () => {
      isCurrent = false;
    };
  }, [roomId]);

  return reading;
}
