import type { Db } from "./connection.ts";
import type { AlarmRow, NewAlarm, SensorName } from "./types.ts";

// "Open" betekent nog niet opgelost: status 'active' of 'acknowledged'.

export function createAlarm(db: Db, alarm: NewAlarm): AlarmRow {
  return db
    .prepare(
      `INSERT INTO alarms (room_id, sensor, value, reason, started_at_ms, buzzer_after_sec)
       VALUES (:room_id, :sensor, :value, :reason, :started_at_ms, COALESCE(:buzzer_after_sec, 60))
       RETURNING *`,
    )
    .get({ ...alarm, buzzer_after_sec: alarm.buzzer_after_sec ?? null }) as AlarmRow;
}

export function getAlarm(db: Db, alarmId: number): AlarmRow | undefined {
  return db.prepare("SELECT * FROM alarms WHERE id = ?").get(alarmId) as AlarmRow | undefined;
}

export function listOpenAlarms(db: Db, roomId: string): AlarmRow[] {
  return db
    .prepare(
      `SELECT * FROM alarms
       WHERE room_id = ? AND status IN ('active', 'acknowledged')
       ORDER BY started_at_ms`,
    )
    .all(roomId) as AlarmRow[];
}

export function getOpenAlarmForSensor(
  db: Db,
  roomId: string,
  sensor: SensorName,
): AlarmRow | undefined {
  return db
    .prepare(
      `SELECT * FROM alarms
       WHERE room_id = ? AND sensor = ? AND status IN ('active', 'acknowledged')
       ORDER BY started_at_ms DESC LIMIT 1`,
    )
    .get(roomId, sensor) as AlarmRow | undefined;
}

// Alleen een actief alarm kan bevestigd worden.
// Geeft het bijgewerkte alarm terug, of undefined als het onbekend of niet actief was.
export function acknowledgeAlarm(
  db: Db,
  alarmId: number,
  acknowledgedBy: string,
  nowMs: number,
): AlarmRow | undefined {
  return db
    .prepare(
      `UPDATE alarms
       SET status = 'acknowledged', acknowledged_at_ms = ?, acknowledged_by = ?
       WHERE id = ? AND status = 'active'
       RETURNING *`,
    )
    .get(nowMs, acknowledgedBy, alarmId) as AlarmRow | undefined;
}

// Sluit een open alarm af omdat de waarde weer normaal is. Geeft false terug als er niets veranderde.
export function resolveAlarm(db: Db, alarmId: number, nowMs: number): boolean {
  const result = db
    .prepare(
      `UPDATE alarms
       SET status = 'resolved', resolved_at_ms = ?
       WHERE id = ? AND status IN ('active', 'acknowledged')`,
    )
    .run(nowMs, alarmId);
  return result.changes === 1;
}
