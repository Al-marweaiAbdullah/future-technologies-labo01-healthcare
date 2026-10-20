import type { Db } from "./connection.ts";
import type { SensorName, ThresholdRow } from "./types.ts";

export type ThresholdValues = Pick<ThresholdRow, "min_value" | "max_value" | "max_duration_sec">;

export function listThresholds(db: Db, roomId: string): ThresholdRow[] {
  return db
    .prepare("SELECT * FROM thresholds WHERE room_id = ? ORDER BY sensor")
    .all(roomId) as ThresholdRow[];
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
  return db
    .prepare(
      `UPDATE thresholds
       SET min_value = :min_value, max_value = :max_value, max_duration_sec = :max_duration_sec
       WHERE room_id = :room_id AND sensor = :sensor
       RETURNING *`,
    )
    .get({ ...values, room_id: roomId, sensor }) as ThresholdRow | undefined;
}
