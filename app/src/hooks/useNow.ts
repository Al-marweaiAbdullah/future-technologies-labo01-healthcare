// De huidige tijd, elke seconde bijgewerkt, voor een aftelling op het scherm.
import { useEffect, useState } from '@lynx-js/react';

const TICK_MS = 1000;

export function useNow(): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return nowMs;
}
