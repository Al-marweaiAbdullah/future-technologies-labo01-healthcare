import type { Db } from "./connection.ts";
import type { AlarmRow, NewAlarm, SensorName } from "./types.ts";

// "Open" betekent nog niet opgelost: status 'active' of 'acknowledged'. Daarop beslissen
// alarms/ en de buzzer. De app toont daarnaast ook opgeloste alarmen die nog niemand zag,
// zodat geen enkel alarm ongezien verdwijnt (zie listAlarmsToShow).

export function createAlarm(db: Db, alarm: NewAlarm): AlarmRow {
  return db
    .prepare(
      `INSERT INTO alarms (room_id, sensor, value, reason, started_at_ms, buzzer_after_sec)
       VALUES (:room_id, :sensor, :value, :reason, :started_at_ms, COALESCE(:buzzer_after_sec, 60))
       RETURNING *`,
    )
    .get({ ...alarm, buzzer_after_sec: alarm.buzzer_after_sec ?? null }) as AlarmRow;
}

// Eén alarm op id, in elke status. Geeft undefined als het id niet bestaat.
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

// Wat de app moet tonen: open alarmen, plus opgeloste alarmen die nog niemand gezien heeft.
export function listAlarmsToShow(db: Db, roomId: string): AlarmRow[] {
  return db
    .prepare(
      `SELECT * FROM alarms
       WHERE room_id = ?
         AND (status IN ('active', 'acknowledged') OR acknowledged_at_ms IS NULL)
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

// Markeert een alarm dat nog niemand zag als gezien. Een actief alarm wordt 'acknowledged';
// een al opgelost alarm blijft 'resolved', maar krijgt wie het zag en wanneer.
// Geeft het bijgewerkte alarm terug, of undefined als het onbekend of al gezien was.
export function acknowledgeAlarm(
  db: Db,
  alarmId: number,
  acknowledgedBy: string,
  nowMs: number,
): AlarmRow | undefined {
  return db
    .prepare(
      `UPDATE alarms
       SET status = CASE status WHEN 'active' THEN 'acknowledged' ELSE status END,
           acknowledged_at_ms = ?,
           acknowledged_by = ?
       WHERE id = ? AND acknowledged_at_ms IS NULL
       RETURNING *`,
    )
    .get(nowMs, acknowledgedBy, alarmId) as AlarmRow | undefined;
}

// Sluit een open alarm af omdat de waarde weer normaal is.
// Geeft het bijgewerkte alarm terug, of undefined als het onbekend of al opgelost was.
export function resolveAlarm(db: Db, alarmId: number, nowMs: number): AlarmRow | undefined {
  return db
    .prepare(
      `UPDATE alarms
       SET status = 'resolved', resolved_at_ms = ?
       WHERE id = ? AND status IN ('active', 'acknowledged')
       RETURNING *`,
    )
    .get(nowMs, alarmId) as AlarmRow | undefined;
}
