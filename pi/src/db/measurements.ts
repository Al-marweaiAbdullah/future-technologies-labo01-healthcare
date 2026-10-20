import type { Db } from "./connection.ts";
import type { MeasurementRow, NewMeasurement } from "./types.ts";

export function saveMeasurement(db: Db, measurement: NewMeasurement): MeasurementRow {
  return db
    .prepare(
      `INSERT INTO measurements
         (room_id, timestamp_ms, temperature_c, humidity_percent, light_raw, motion)
       VALUES
         (:room_id, :timestamp_ms, :temperature_c, :humidity_percent, :light_raw, :motion)
       RETURNING *`,
    )
    .get(measurement) as MeasurementRow;
}

export function getLatestMeasurement(db: Db, roomId: string): MeasurementRow | undefined {
  return db
    .prepare("SELECT * FROM measurements WHERE room_id = ? ORDER BY timestamp_ms DESC LIMIT 1")
    .get(roomId) as MeasurementRow | undefined;
}

// Metingen tussen fromMs en toMs (beide inbegrepen), oudste eerst. Bedoeld voor grafieken.
export function listMeasurements(
  db: Db,
  roomId: string,
  fromMs: number,
  toMs: number,
): MeasurementRow[] {
  return db
    .prepare(
      `SELECT * FROM measurements
       WHERE room_id = ? AND timestamp_ms BETWEEN ? AND ?
       ORDER BY timestamp_ms`,
    )
    .all(roomId, fromMs, toMs) as MeasurementRow[];
}
