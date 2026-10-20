// Zet waarden uit het contract om naar tekst voor op het scherm. Pure functies, zonder Lynx.
import { AlarmStatus, Metric } from '../generated/restwell/v1/restwell_pb.js';

export const MISSING_VALUE = '–';

function formatDecimal(value: number, fractionDigits: number): string {
  return value.toFixed(fractionDigits).replace('.', ',');
}

export function formatTemperature(celsius?: number): string {
  return celsius === undefined
    ? MISSING_VALUE
    : `${formatDecimal(celsius, 1)} °C`;
}

export function formatHumidity(percent?: number): string {
  return percent === undefined ? MISSING_VALUE : `${Math.round(percent)} %`;
}

/** Ruwe waarde van de lichtsensor: 0 (donker) tot 1023 (fel licht), dus zonder eenheid. */
export function formatLight(raw?: number): string {
  return raw === undefined ? MISSING_VALUE : String(raw);
}

export function formatMotion(detected?: boolean): string {
  if (detected === undefined) return MISSING_VALUE;
  return detected ? 'Beweging' : 'Geen beweging';
}

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

/** Tijdstip als `HH:MM` in de tijdzone van het toestel. */
export function formatTime(timestampMs: bigint): string {
  const date = new Date(Number(timestampMs));
  return `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
}

const METRIC_LABELS: Record<Metric, string> = {
  [Metric.UNSPECIFIED]: 'Onbekend',
  [Metric.TEMPERATURE]: 'Temperatuur',
  [Metric.HUMIDITY]: 'Luchtvochtigheid',
  [Metric.LIGHT]: 'Licht',
  [Metric.MOTION]: 'Beweging',
};

export function metricLabel(metric: Metric): string {
  return METRIC_LABELS[metric];
}

/** Een alarmwaarde in de eenheid van de sensor, bv. `26,0 °C`. */
export function formatMetricValue(metric: Metric, value?: number): string {
  switch (metric) {
    case Metric.TEMPERATURE:
      return formatTemperature(value);
    case Metric.HUMIDITY:
      return formatHumidity(value);
    case Metric.LIGHT:
      return formatLight(value);
    case Metric.MOTION:
      return formatMotion(value === undefined ? undefined : value !== 0);
    default:
      return value === undefined ? MISSING_VALUE : String(value);
  }
}

const ALARM_STATUS_LABELS: Record<AlarmStatus, string> = {
  [AlarmStatus.UNSPECIFIED]: 'Onbekend',
  [AlarmStatus.ACTIVE]: 'Actief',
  [AlarmStatus.ACKNOWLEDGED]: 'Gezien',
  [AlarmStatus.RESOLVED]: 'Opgelost',
};

export function alarmStatusLabel(status: AlarmStatus): string {
  return ALARM_STATUS_LABELS[status];
}

/** Bv. `1 alarm` of `3 alarmen`; `Alles in orde` als er geen zijn. */
export function formatAlarmCount(count: number): string {
  if (count === 0) return 'Alles in orde';
  return count === 1 ? '1 alarm' : `${count} alarmen`;
}
