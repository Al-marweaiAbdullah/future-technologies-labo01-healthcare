import type { AlarmRow, NewAlarm, NewMeasurement, SensorName, ThresholdRow } from "../db/index.ts";

export type RoomLevel = "green" | "orange" | "red";

export type ThresholdCheck = "too_low" | "too_high" | "ok";

// Wat de kamer moet tonen of doen: LED, buzzer en tekst op de OLED.
export type RoomOutput = {
  led: boolean;
  buzzer: boolean;
  displayText: string;
};

// Per sensor: sinds wanneer (ms, UTC) de waarde onafgebroken buiten de drempel zit.
export type ExceededSince = ReadonlyMap<SensorName, number>;

export type EvaluationInput = {
  measurement: NewMeasurement;
  thresholds: ThresholdRow[];
  openAlarms: AlarmRow[];
  exceededSince: ExceededSince;
  nowMs: number;
};

export type Evaluation = {
  alarmsToCreate: NewAlarm[];
  alarmIdsToResolve: number[];
  exceededSince: ExceededSince;
};
