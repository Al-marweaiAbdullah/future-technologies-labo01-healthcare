import type { Db } from "./connection.ts";
import type { SensorName, ThresholdRow } from "./types.ts";

const HOURS_PER_DAY = 24;

// Laat je active_from_hour en active_to_hour weg (undefined), dan blijven de actieve uren
// ongewijzigd. Zo wist een client die de uren nog niet kent ze niet bij een gewone update.
export type ThresholdValues = Pick<ThresholdRow, "min_value" | "max_value" | "max_duration_sec"> &
  Partial<Pick<ThresholdRow, "active_from_hour" | "active_to_hour">>;

export function listThresholds(db: Db, roomId: string): ThresholdRow[] {
  return db
    .prepare("SELECT * FROM thresholds WHERE room_id = ? ORDER BY sensor")
    .all(roomId) as ThresholdRow[];
}

function isValidHour(hour: number): boolean {
  return Number.isInteger(hour) && hour >= 0 && hour < HOURS_PER_DAY;
}

function assertValidActiveHours(values: ThresholdValues): void {
  const from = values.active_from_hour ?? null;
  const to = values.active_to_hour ?? null;
  if (from === null && to === null) return;
  if (from === null || to === null) {
    throw new RangeError("Geef het begin- en einduur samen op, of laat ze allebei leeg");
  }
  if (!isValidHour(from) || !isValidHour(to)) {
    throw new RangeError("Een uur moet een geheel getal van 0 tot en met 23 zijn");
  }
  if (from === to) {
    throw new RangeError("Begin- en einduur mogen niet gelijk zijn; laat ze leeg voor altijd");
  }
}

// Weigert waarden die nooit kloppen, zodat een typfout geen alarm onmogelijk of permanent maakt.
function assertValidThreshold(values: ThresholdValues): void {
  const { min_value, max_value, max_duration_sec } = values;
  for (const value of [min_value, max_value, max_duration_sec]) {
    if (value !== null && !Number.isFinite(value)) {
      throw new RangeError("Een drempel moet een getal zijn");
    }
  }
  if (min_value !== null && max_value !== null && min_value > max_value) {
    throw new RangeError("Het minimum mag niet groter zijn dan het maximum");
  }
  if (max_duration_sec !== null && (max_duration_sec < 0 || !Number.isInteger(max_duration_sec))) {
    throw new RangeError("De duur moet een geheel aantal seconden van 0 of meer zijn");
  }
  assertValidActiveHours(values);
}

// Past een bestaande drempel aan. Geeft de nieuwe drempel terug, of undefined als de kamer
// die sensor niet heeft. Gooit een RangeError bij ongeldige waarden.
// main.ts leest de drempels bij elke meting, dus de wijziging werkt meteen.
export function updateThreshold(
  db: Db,
  roomId: string,
  sensor: SensorName,
  values: ThresholdValues,
): ThresholdRow | undefined {
  assertValidThreshold(values);
  const setActiveHours =
    values.active_from_hour !== undefined || values.active_to_hour !== undefined;
  return db
    .prepare(
      `UPDATE thresholds
       SET min_value = :min_value, max_value = :max_value, max_duration_sec = :max_duration_sec,
           active_from_hour = CASE WHEN :set_active_hours THEN :active_from_hour ELSE active_from_hour END,
           active_to_hour = CASE WHEN :set_active_hours THEN :active_to_hour ELSE active_to_hour END
       WHERE room_id = :room_id AND sensor = :sensor
       RETURNING *`,
    )
    .get({
      min_value: values.min_value,
      max_value: values.max_value,
      max_duration_sec: values.max_duration_sec,
      active_from_hour: values.active_from_hour ?? null,
      active_to_hour: values.active_to_hour ?? null,
      set_active_hours: setActiveHours ? 1 : 0, // better-sqlite3 kent geen boolean
      room_id: roomId,
      sensor,
    }) as ThresholdRow | undefined;
}
