// Voert RestWellService uit het contract uit, met de gegevens uit db/.
import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import {
  acknowledgeAlarm,
  getAlarm,
  getLatestMeasurement,
  getRoom,
  listMeasurements,
  listAlarmsSince,
  listAlarmsToShow,
  listRooms,
  listThresholds,
  updateThreshold,
  type Db,
} from "../db/index.ts";
import { RestWellService } from "./generated/restwell/v1/restwell_pb.js";
import { publishAlarm, subscribe } from "./events.ts";
import {
  toAlarm,
  toReading,
  toRoom,
  toSensorName,
  toThreshold,
  toThresholdValues,
} from "./mapping.ts";

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

    listThresholds(req) {
      assertRoomExists(db, req.roomId);
      return { thresholds: listThresholds(db, req.roomId).map(toThreshold) };
    },

    updateThreshold(req) {
      const threshold = req.threshold;
      if (!threshold) {
        throw new ConnectError("threshold is verplicht", Code.InvalidArgument);
      }
      const sensor = toSensorName(threshold.metric);
      if (!sensor) {
        throw new ConnectError("metric is verplicht", Code.InvalidArgument);
      }
      assertRoomExists(db, threshold.roomId);

      let updated;
      try {
        updated = updateThreshold(db, threshold.roomId, sensor, toThresholdValues(threshold));
      } catch (error) {
        // db/ weigert waarden die nooit kloppen, bv. een minimum boven het maximum.
        if (error instanceof RangeError) {
          throw new ConnectError(error.message, Code.InvalidArgument);
        }
        throw error;
      }
      if (!updated) {
        throw new ConnectError(
          `kamer "${threshold.roomId}" heeft geen drempel voor ${sensor}`,
          Code.NotFound,
        );
      }
      log(`Drempel aangepast voor kamer "${threshold.roomId}": ${sensor}`);
      return { threshold: toThreshold(updated) };
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
      // Ook opgeloste alarmen die nog niemand zag: geen enkel alarm mag ongezien verdwijnen.
      return { alarms: listAlarmsToShow(db, req.roomId).map(toAlarm) };
    },

    listAlarms(req) {
      assertRoomExists(db, req.roomId);
      return { alarms: listAlarmsSince(db, req.roomId, Number(req.sinceMs)).map(toAlarm) };
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
      // Al gezien, bv. door een collega die tegelijk op "gezien" tikte: niets veranderen.
      return { alarm: toAlarm(existing) };
    },
  };
}
