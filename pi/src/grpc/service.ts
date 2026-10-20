// Voert RestWellService uit het contract uit, met de gegevens uit db/.
import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import {
  acknowledgeAlarm,
  getAlarm,
  getLatestMeasurement,
  getRoom,
  listMeasurements,
  listOpenAlarms,
  listRooms,
  type Db,
} from "../db/index.ts";
import { RestWellService } from "./generated/restwell/v1/restwell_pb.js";
import { publishAlarm, subscribe } from "./events.ts";
import { toAlarm, toReading, toRoom } from "./mapping.ts";

function assertRoomExists(db: Db, roomId: string): void {
  if (!getRoom(db, roomId)) {
    throw new ConnectError(`kamer "${roomId}" bestaat niet`, Code.NotFound);
  }
}

// Logt alleen wat er gebeurt (verbindingen), nooit meetwaarden.
export type Log = (message: string) => void;

export function createRestWellService(db: Db, log: Log): ServiceImpl<typeof RestWellService> {
  return {
    listRooms() {
      return { rooms: listRooms(db).map(toRoom) };
    },

    async *watchRoom(req, context) {
      assertRoomExists(db, req.roomId);
      const events = subscribe(req.roomId, context.signal);
      log(`WatchRoom geopend voor kamer "${req.roomId}"`);

      try {
        const latest = getLatestMeasurement(db, req.roomId);
        if (latest) yield { event: { case: "reading", value: toReading(latest) } };

        for await (const event of events) {
          yield { event };
        }
      } finally {
        log(`WatchRoom gesloten voor kamer "${req.roomId}"`);
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

    acknowledgeAlarm(req) {
      const acknowledgedBy = req.acknowledgedBy.trim();
      if (!acknowledgedBy) {
        throw new ConnectError(
          "acknowledged_by is verplicht (initialen of rol)",
          Code.InvalidArgument,
        );
      }
      const alarmId = Number(req.alarmId);

      const acknowledged = acknowledgeAlarm(db, alarmId, acknowledgedBy, Date.now());
      if (acknowledged) {
        // Andere telefoons zien meteen dat het alarm gezien is. De buzzer stopt bij de
        // volgende meting in main.ts, omdat decideRoomOutput alleen actieve alarmen laat zoemen.
        publishAlarm(acknowledged);
        return { alarm: toAlarm(acknowledged) };
      }

      const existing = getAlarm(db, alarmId);
      if (!existing) {
        throw new ConnectError(`alarm ${alarmId} bestaat niet`, Code.NotFound);
      }
      if (existing.status === "resolved") {
        throw new ConnectError(`alarm ${alarmId} is al opgelost`, Code.FailedPrecondition);
      }
      // Al bevestigd, bv. door een collega die tegelijk op "gezien" tikte: niets veranderen.
      return { alarm: toAlarm(existing) };
    },
  };
}
