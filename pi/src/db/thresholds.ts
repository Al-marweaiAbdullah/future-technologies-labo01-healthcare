import type { Db } from "./connection.ts";
import type { ThresholdRow } from "./types.ts";

export function listThresholds(db: Db, roomId: string): ThresholdRow[] {
  return db
    .prepare("SELECT * FROM thresholds WHERE room_id = ? ORDER BY sensor")
    .all(roomId) as ThresholdRow[];
}
