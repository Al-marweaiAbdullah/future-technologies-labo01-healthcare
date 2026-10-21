// De detailregel van een alarm. Valt een sensor uit, dan maakt de Pi een alarm zonder waarde
// (pi/src/alarms/offline.ts): een drempelalarm heeft altijd een waarde. Pure functies, zonder Lynx.
import { type Alarm } from '../generated/restwell/v1/restwell_pb.js';
import { formatMetricValue, metricLabel } from './measurements.js';

/** Geeft de sensor van dit alarm geen waarde meer door? */
export function isSensorOffline(alarm: Alarm): boolean {
  return alarm.value === undefined;
}

/** Bv. `Temperatuur: 27,4 °C`, of `Temperatuur: controleer de sensor` bij een uitgevallen sensor. */
export function alarmDetail(alarm: Alarm): string {
  const label = metricLabel(alarm.metric);
  if (isSensorOffline(alarm)) return `${label}: controleer de sensor`;
  return `${label}: ${formatMetricValue(alarm.metric, alarm.value)}`;
}
