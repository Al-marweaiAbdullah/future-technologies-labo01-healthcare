import type { Db } from "./connection.ts";
import type { RoomRow } from "./types.ts";

export function listRooms(db: Db): RoomRow[] {
  return db.prepare("SELECT id, name FROM rooms ORDER BY id").all() as RoomRow[];
}

export function getRoom(db: Db, roomId: string): RoomRow | undefined {
  return db.prepare("SELECT id, name FROM rooms WHERE id = ?").get(roomId) as RoomRow | undefined;
}
