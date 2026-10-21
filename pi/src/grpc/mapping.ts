// Vertaalt tussen rijen uit db/ en de types uit het contract. Andere logica hoort hier niet.
import { create } from "@bufbuild/protobuf";
import type {
  AlarmRow,
  AlarmStatus as DbAlarmStatus,
  MeasurementRow,
  RoomRow,
  SensorName,
  ThresholdRow,
  ThresholdValues,
} from "../db/index.ts";
import {
  AlarmSchema,
  AlarmStatus,
  Metric,
  ReadingSchema,
  RoomSchema,
  ThresholdSchema,
  type Alarm,
  type Reading,
  type Room,
  type Threshold,
} from "./generated/restwell/v1/restwell_pb.js";

const METRIC_BY_SENSOR: Record<SensorName, Metric> = {
  temperature: Metric.TEMPERATURE,
  humidity: Metric.HUMIDITY,
  light: Metric.LIGHT,
  motion: Metric.MOTION,
};

const SENSOR_BY_METRIC = new Map<Metric, SensorName>(
  Object.entries(METRIC_BY_SENSOR).map(([sensor, metric]) => [metric, sensor as SensorName]),
);

// De sensornaam in de database, of undefined voor METRIC_UNSPECIFIED of een onbekende waarde.
export function toSensorName(metric: Metric): SensorName | undefined {
  return SENSOR_BY_METRIC.get(metric);
}

const STATUS_BY_DB_STATUS: Record<DbAlarmStatus, AlarmStatus> = {
  active: AlarmStatus.ACTIVE,
  acknowledged: AlarmStatus.ACKNOWLEDGED,
  resolved: AlarmStatus.RESOLVED,
};

// SQLite geeft NULL, het contract verwacht een leeg optional veld.
function optional<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

function optionalBigInt(value: number | null): bigint | undefined {
  return value === null ? undefined : BigInt(value);
}

export function toRoom(row: RoomRow): Room {
  return create(RoomSchema, { id: row.id, name: row.name });
}

export function toReading(row: MeasurementRow): Reading {
  return create(ReadingSchema, {
    roomId: row.room_id,
    timestampMs: BigInt(row.timestamp_ms),
    temperatureC: optional(row.temperature_c),
    humidityPercent: optional(row.humidity_percent),
    lightRaw: optional(row.light_raw),
    motionDetected: row.motion === null ? undefined : row.motion === 1,
  });
}

export function toAlarm(row: AlarmRow): Alarm {
  return create(AlarmSchema, {
    id: BigInt(row.id),
    roomId: row.room_id,
    metric: METRIC_BY_SENSOR[row.sensor],
    value: optional(row.value),
    reason: row.reason,
    status: STATUS_BY_DB_STATUS[row.status],
    startedAtMs: BigInt(row.started_at_ms),
    buzzerAfterSec: row.buzzer_after_sec,
    acknowledgedAtMs: optionalBigInt(row.acknowledged_at_ms),
    acknowledgedBy: optional(row.acknowledged_by),
    resolvedAtMs: optionalBigInt(row.resolved_at_ms),
  });
}

export function toThreshold(row: ThresholdRow): Threshold {
  return create(ThresholdSchema, {
    roomId: row.room_id,
    metric: METRIC_BY_SENSOR[row.sensor],
    minValue: optional(row.min_value),
    maxValue: optional(row.max_value),
    maxDurationSec: optional(row.max_duration_sec),
    activeFromHour: optional(row.active_from_hour),
    activeToHour: optional(row.active_to_hour),
  });
}

// Een leeg veld in het contract wordt NULL in de database: geen grens aan die kant.
// Lege uren blijven undefined: db/ laat de actieve uren dan ongewijzigd.
export function toThresholdValues(threshold: Threshold): ThresholdValues {
  return {
    min_value: threshold.minValue ?? null,
    max_value: threshold.maxValue ?? null,
    max_duration_sec: threshold.maxDurationSec ?? null,
    active_from_hour: threshold.activeFromHour,
    active_to_hour: threshold.activeToHour,
  };
}
