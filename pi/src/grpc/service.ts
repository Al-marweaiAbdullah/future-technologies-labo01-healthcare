// Voert RestWellService uit het contract uit, met de gegevens uit db/.
import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import {
  getLatestMeasurement,
  getRoom,
  listMeasurements,
  listOpenAlarms,
  listRooms,
  type Db,
} from "../db/index.ts";
import { RestWellService } from "./generated/restwell/v1/restwell_pb.js";
import { subscribe } from "./events.ts";
import { toAlarm, toReading, toRoom } from "./mapping.ts";

function assertRoomExists(db: Db, roomId: string): void {
  if (!getRoom(db, roomId)) {
    throw new ConnectError(`kamer "${roomId}" bestaat niet`, Code.NotFound);
  }
}

export function createRestWellService(db: Db): ServiceImpl<typeof RestWellService> {
  return {
    listRooms() {
      return { rooms: listRooms(db).map(toRoom) };
    },

    async *watchRoom(req, context) {
      assertRoomExists(db, req.roomId);
      const events = subscribe(req.roomId, context.signal);

      const latest = getLatestMeasurement(db, req.roomId);
      if (latest) yield { event: { case: "reading", value: toReading(latest) } };

      for await (const event of events) {
        yield { event };
      }
    },

    listReadings(req) {
      assertRoomExists(db, req.roomId);
      const rows = listMeasurements(db, req.roomId, Number(req.sinceMs), Number.MAX_SAFE_INTEGER);
      return { readings: rows.map(toReading) };
    },

    listOpenAlarms(req) {
      assertRoomExists(db, req.roomId);
      return { alarms: listOpenAlarms(db, req.roomId).map(toAlarm) };
    },

    acknowledgeAlarm() {
      // db/ heeft nog geen functie om één alarm op te halen; zonder die kan dit het
      // bijgewerkte alarm niet teruggeven (gemeld aan de backend).
      throw new ConnectError("AcknowledgeAlarm is nog niet beschikbaar", Code.Unimplemented);
    },
  };
}
