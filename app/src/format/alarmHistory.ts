// Hulpfuncties voor de alarmgeschiedenis (ListAlarms). Pure functies, zonder Lynx of netwerk.
import type { Alarm } from '../generated/restwell/v1/restwell_pb.js';
import { formatTime } from './measurements.js';

/**
 * Verandert zodra een alarm bijkomt, van status verandert, gezien wordt of verdwijnt.
 * De geschiedenis wordt dan opnieuw opgehaald, zodat ze klopt met de live alarmen.
 */
export function alarmHistoryKey(alarms: Alarm[]): string {
  return alarms
    .map(
      (alarm) =>
        `${alarm.id}:${alarm.status}:${alarm.acknowledgedAtMs ?? ''}:${alarm.resolvedAtMs ?? ''}`,
    )
    .join(',');
}

/** Bv. `14:02–14:10`, of `sinds 14:02` als het alarm nog niet opgelost is. */
export function formatAlarmPeriod(alarm: Alarm): string {
  const startedAt = formatTime(alarm.startedAtMs);
  if (alarm.resolvedAtMs === undefined) return `sinds ${startedAt}`;
  return `${startedAt}–${formatTime(alarm.resolvedAtMs)}`;
}
