import type { AlarmRow, NewAlarm, NewMeasurement, SensorName } from "../db/index.ts";

const MS_PER_SEC = 1000;

// De DHT22 meet hoogstens om de 2 s en een enkele mislukte uitlezing komt voor
// (zie hardware/read-all.ts). Pas na zo lang zonder waarde is de sensor echt uitgevallen.
export const OFFLINE_AFTER_SEC = 120;

// Per sensor: sinds wanneer (ms, UTC) er onafgebroken geen waarde meer is.
export type MissingSince = ReadonlyMap<SensorName, number>;

export type SensorHealthInput = {
  measurement: NewMeasurement;
  openAlarms: AlarmRow[];
  missingSince: MissingSince;
  nowMs: number;
};

export type SensorHealth = {
  alarmsToCreate: NewAlarm[];
  alarmIdsToResolve: number[];
  missingSince: MissingSince;
};

// Teksten voor de verpleging en de OLED.
const SENSOR_LABELS: Record<SensorName, string> = {
  temperature: "Temperatuursensor",
  humidity: "Luchtvochtigheidssensor",
  light: "Lichtsensor",
  motion: "Bewegingssensor",
};

const MONITORED_SENSORS = Object.keys(SENSOR_LABELS) as SensorName[];

function sensorValue(measurement: NewMeasurement, sensor: SensorName): number | null {
  switch (sensor) {
    case "temperature":
      return measurement.temperature_c;
    case "humidity":
      return measurement.humidity_percent;
    case "light":
      return measurement.light_raw;
    case "motion":
      return measurement.motion;
  }
}

function isOpen(alarm: AlarmRow): boolean {
  return alarm.status === "active" || alarm.status === "acknowledged";
}

// Een alarm van deze module herken je aan value = null: een drempelalarm heeft altijd een waarde.
// Zo hoeft het contract en het schema niet te weten dat dit een ander soort alarm is.
function isOfflineAlarm(alarm: AlarmRow): boolean {
  return alarm.value === null;
}

// Bewaakt of de sensoren nog een waarde geven. `evaluateMeasurement` doet niets met een
// ontbrekende waarde, dus zonder deze controle merkt niemand dat een sensor uitgevallen is.
// Schrijft zelf niets weg: de aanroeper slaat alarmsToCreate op en lost alarmIdsToResolve op.
export function evaluateSensorHealth(input: SensorHealthInput): SensorHealth {
  const { measurement, openAlarms, nowMs } = input;
  const missingSince = new Map(input.missingSince);
  const alarmsToCreate: NewAlarm[] = [];
  const alarmIdsToResolve: number[] = [];

  for (const sensor of MONITORED_SENSORS) {
    const openForSensor = openAlarms.filter((alarm) => alarm.sensor === sensor && isOpen(alarm));

    if (sensorValue(measurement, sensor) !== null) {
      missingSince.delete(sensor);
      for (const alarm of openForSensor.filter(isOfflineAlarm)) alarmIdsToResolve.push(alarm.id);
      continue;
    }

    const sinceMs = missingSince.get(sensor) ?? nowMs;
    missingSince.set(sensor, sinceMs);

    const missingLongEnough = nowMs - sinceMs > OFFLINE_AFTER_SEC * MS_PER_SEC;
    if (openForSensor.length > 0 || !missingLongEnough) continue;

    alarmsToCreate.push({
      room_id: measurement.room_id,
      sensor,
      value: null,
      reason: `${SENSOR_LABELS[sensor]} geeft geen waarde`,
      started_at_ms: nowMs,
    });
  }

  return { alarmsToCreate, alarmIdsToResolve, missingSince };
}
