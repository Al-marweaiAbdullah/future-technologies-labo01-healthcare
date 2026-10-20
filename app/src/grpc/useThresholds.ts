// De drempels (comfortzone) van een kamer, één keer opgehaald bij het openen van het scherm.
// Lukt het niet, dan toont de app gewoon geen comfortzone: de metingen blijven werken.
import { useEffect, useState } from '@lynx-js/react';

import type { Threshold } from '../generated/restwell/v1/restwell_pb.js';
import { restWell } from './client.js';

export function useThresholds(roomId: string): Threshold[] {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);

  useEffect(() => {
    let isCurrent = true;
    setThresholds([]);

    restWell
      .listThresholds({ roomId })
      .then((response) => {
        if (isCurrent) setThresholds(response.thresholds);
      })
      .catch((error: unknown) => {
        console.warn('ListThresholds mislukt', error);
      });

    return () => {
      isCurrent = false;
    };
  }, [roomId]);

  return thresholds;
}
