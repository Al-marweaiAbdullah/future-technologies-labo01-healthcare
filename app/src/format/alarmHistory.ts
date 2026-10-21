// Hulpfuncties voor de alarmgeschiedenis (ListAlarms). Pure functies, zonder Lynx of netwerk.
import {
  AlarmStatus,
  type Alarm,
  type Metric,
} from '../generated/restwell/v1/restwell_pb.js';
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

function formatDay(timestampMs: bigint): string {
  const date = new Date(Number(timestampMs));
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/**
 * Bv. `14:02–14:10`, of `sinds 14:02` als het alarm nog niet opgelost is.
 * Met `withDate` komt de dag ervoor (`3/11 14:02–14:10`), voor een lijst over meerdere dagen.
 */
export function formatAlarmPeriod(alarm: Alarm, withDate = false): string {
  const day = withDate ? `${formatDay(alarm.startedAtMs)} ` : '';
  const startedAt = `${day}${formatTime(alarm.startedAtMs)}`;
  if (alarm.resolvedAtMs === undefined) return `sinds ${startedAt}`;
  return `${startedAt}–${formatTime(alarm.resolvedAtMs)}`;
}

export type AlarmStatusFilter = 'all' | 'open' | 'resolved';

export type AlarmFilter = {
  /** `undefined`: alle sensoren. */
  metric?: Metric;
  status: AlarmStatusFilter;
};

function matchesStatus(alarm: Alarm, status: AlarmStatusFilter): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'open':
      return alarm.status === AlarmStatus.ACTIVE;
    case 'resolved':
      return alarm.status === AlarmStatus.RESOLVED;
  }
}

/** Houdt de alarmen over die bij de gekozen sensor en status passen; de volgorde blijft. */
export function filterAlarms(alarms: Alarm[], filter: AlarmFilter): Alarm[] {
  return alarms.filter(
    (alarm) =>
      (filter.metric === undefined || alarm.metric === filter.metric) &&
      matchesStatus(alarm, filter.status),
  );
}
