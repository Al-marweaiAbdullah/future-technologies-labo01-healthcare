// Hoe lang het nog duurt voor de buzzer in de kamer afgaat. Dezelfde regel als op de Pi
// (pi/src/alarms/output.ts): de buzzer gaat af als een actief alarm buzzer_after_sec lang
// niet als gezien gemarkeerd is. Pure functies, zonder Lynx.
import {
  AlarmStatus,
  type Alarm,
} from '../generated/restwell/v1/restwell_pb.js';

const MS_PER_SEC = 1000;
const SEC_PER_MIN = 60;

/** Seconden tot de buzzer afgaat (0 = gaat al af), of `undefined` als hij niet meer afgaat. */
export function buzzerSecondsLeft(
  alarm: Alarm,
  nowMs: number,
): number | undefined {
  if (alarm.status !== AlarmStatus.ACTIVE) return undefined;
  const buzzerAtMs =
    Number(alarm.startedAtMs) + alarm.buzzerAfterSec * MS_PER_SEC;
  return Math.max(0, Math.ceil((buzzerAtMs - nowMs) / MS_PER_SEC));
}

function formatDuration(seconds: number): string {
  if (seconds < SEC_PER_MIN) return `${seconds} s`;
  const minutes = Math.floor(seconds / SEC_PER_MIN);
  const rest = seconds % SEC_PER_MIN;
  return `${minutes} min ${String(rest).padStart(2, '0')} s`;
}

/**
 * Bv. `Buzzer over 45 s` of `Buzzer gaat af`, voor het alarm waarvoor de buzzer het eerst
 * afgaat; `undefined` als hij voor geen enkel van deze alarmen nog afgaat.
 */
export function formatBuzzerCountdown(
  alarms: Alarm[],
  nowMs: number,
): string | undefined {
  const secondsLeft = alarms
    .map((alarm) => buzzerSecondsLeft(alarm, nowMs))
    .filter((seconds) => seconds !== undefined);
  if (secondsLeft.length === 0) return undefined;
  const soonest = Math.min(...secondsLeft);
  return soonest === 0
    ? 'Buzzer gaat af'
    : `Buzzer over ${formatDuration(soonest)}`;
}
