// Rij-types van de database. Ze blijven binnen db/: naar buiten gaan de types uit /proto.

export type SensorName = "temperature" | "humidity" | "light" | "motion";
export type AlarmStatus = "active" | "acknowledged" | "resolved";

export type RoomRow = {
  id: string;
  name: string;
};

export type MeasurementRow = {
  id: number;
  room_id: string;
  timestamp_ms: number;
  temperature_c: number | null;
  humidity_percent: number | null;
  light_raw: number | null;
  motion: 0 | 1 | null; // SQLite kent geen boolean
};

export type NewMeasurement = Omit<MeasurementRow, "id">;

export type ThresholdRow = {
  room_id: string;
  sensor: SensorName;
  min_value: number | null;
  max_value: number | null;
  max_duration_sec: number | null;
  // Uren (0-23, lokale tijd) waarin de regel geldt, eind-uur niet inbegrepen. Beide null = altijd.
  active_from_hour: number | null;
  active_to_hour: number | null;
};

export type AlarmRow = {
  id: number;
  room_id: string;
  sensor: SensorName;
  value: number | null;
  reason: string;
  started_at_ms: number;
  buzzer_after_sec: number;
  status: AlarmStatus;
  acknowledged_at_ms: number | null;
  acknowledged_by: string | null;
  resolved_at_ms: number | null;
};

export type NewAlarm = {
  room_id: string;
  sensor: SensorName;
  value: number | null;
  reason: string;
  started_at_ms: number;
  buzzer_after_sec?: number; // standaard 60, zie het schema
};
