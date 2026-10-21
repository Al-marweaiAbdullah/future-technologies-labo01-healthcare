import type { NewAlarm, NewMeasurement, SensorName, ThresholdRow } from "../db/index.ts";
import { formatReason } from "./reason.ts";
import { checkThreshold, isActiveAtHour } from "./thresholds.ts";
import type { Evaluation, EvaluationInput } from "./types.ts";

const MS_PER_SEC = 1000;

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

// Met max_duration_sec moet de waarde langer dan die tijd buiten de drempel blijven.
// Zonder duur telt al één meting. Zo geeft één uitschieter geen alarm.
function exceededLongEnough(threshold: ThresholdRow, sinceMs: number, nowMs: number): boolean {
  if (threshold.max_duration_sec === null) return true;
  return nowMs - sinceMs > threshold.max_duration_sec * MS_PER_SEC;
}

// Beslist welke alarmen starten en welke opgelost zijn. Schrijft zelf niets weg:
// de aanroeper slaat alarmsToCreate op en lost alarmIdsToResolve op via db/.
export function evaluateMeasurement(input: EvaluationInput): Evaluation {
  const { measurement, thresholds, openAlarms, nowMs, localHour } = input;
  const exceededSince = new Map(input.exceededSince);
  const alarmsToCreate: NewAlarm[] = [];
  const alarmIdsToResolve: number[] = [];

  for (const threshold of thresholds) {
    const { sensor } = threshold;
    if (sensor === "motion") continue; // beweging wordt enkel gelogd

    const openAlarm = openAlarms.find((alarm) => alarm.sensor === sensor);

    // Buiten de actieve uren telt de regel niet: geen nieuw alarm, en een open alarm
    // (bv. licht dat 's nachts te lang aan was) sluit zodra de dag begint.
    if (localHour !== undefined && !isActiveAtHour(threshold, localHour)) {
      exceededSince.delete(sensor);
      if (openAlarm) alarmIdsToResolve.push(openAlarm.id);
      continue;
    }

    const value = sensorValue(measurement, sensor);
    if (value === null) continue; // geen waarde: niets veranderen

    const check = checkThreshold(value, threshold);

    if (check === "ok") {
      exceededSince.delete(sensor);
      if (openAlarm) alarmIdsToResolve.push(openAlarm.id);
      continue;
    }

    const sinceMs = exceededSince.get(sensor) ?? nowMs;
    exceededSince.set(sensor, sinceMs);

    if (openAlarm || !exceededLongEnough(threshold, sinceMs, nowMs)) continue;

    alarmsToCreate.push({
      room_id: measurement.room_id,
      sensor,
      value,
      reason: formatReason(sensor, check, value),
      started_at_ms: nowMs,
    });
  }

  return { alarmsToCreate, alarmIdsToResolve, exceededSince };
}
