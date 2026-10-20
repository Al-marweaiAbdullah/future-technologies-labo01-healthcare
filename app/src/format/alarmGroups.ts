// Groepeert alarmen per sensor. De Pi maakt telkens een nieuw alarm als een waarde opnieuw
// buiten de grens gaat, en een opgelost alarm blijft staan tot iemand het gezien heeft.
// Zonder groeperen stapelen alarmen van dezelfde sensor zich op; de verpleegkundige wil per
// sensor één melding zien. Pure functies, zonder Lynx of netwerk.
import type { Alarm, Metric } from '../generated/restwell/v1/restwell_pb.js';

export type AlarmGroup = {
  metric: Metric;
  /** Het nieuwste alarm van deze sensor: dat toont de kaart. */
  latest: Alarm;
  /** Alle alarmen van deze sensor die nog aandacht vragen, oudste eerst. */
  alarms: Alarm[];
  /** Begin van het oudste alarm in de groep. */
  firstStartedAtMs: bigint;
};

function byStartTime(a: Alarm, b: Alarm): number {
  if (a.startedAtMs === b.startedAtMs) return 0;
  return a.startedAtMs < b.startedAtMs ? -1 : 1;
}

/** Eén groep per sensor, gesorteerd op het oudste alarm (dat wacht het langst). */
export function groupAlarmsByMetric(alarms: Alarm[]): AlarmGroup[] {
  const byMetric = new Map<Metric, Alarm[]>();
  for (const alarm of [...alarms].sort(byStartTime)) {
    byMetric.set(alarm.metric, [...(byMetric.get(alarm.metric) ?? []), alarm]);
  }

  const groups: AlarmGroup[] = [];
  for (const [metric, group] of byMetric) {
    const first = group[0];
    const latest = group[group.length - 1];
    if (!first || !latest) continue;
    groups.push({
      metric,
      latest,
      alarms: group,
      firstStartedAtMs: first.startedAtMs,
    });
  }
  return groups;
}
