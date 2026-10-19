// Meldingsbus voor WatchRoom: wie een meting of alarm opslaat of wijzigt, meldt het hier.
// Elke open WatchRoom-stroom luistert mee en stuurt het meteen naar de app.
import { EventEmitter, on } from "node:events";
import type { AlarmRow, MeasurementRow } from "../db/index.ts";
import type { WatchRoomResponse } from "./generated/restwell/v1/restwell_pb.js";
import { toAlarm, toReading } from "./mapping.ts";

export type RoomEvent = WatchRoomResponse["event"];

const bus = new EventEmitter();
bus.setMaxListeners(0); // elke open stroom is één luisteraar, er is geen bovengrens

// Voorvoegsel zodat een kamer-id nooit botst met de speciale gebeurtenis "error".
function channel(roomId: string): string {
  return `room:${roomId}`;
}

export function publishMeasurement(row: MeasurementRow): void {
  const event: RoomEvent = { case: "reading", value: toReading(row) };
  bus.emit(channel(row.room_id), event);
}

export function publishAlarm(row: AlarmRow): void {
  const event: RoomEvent = { case: "alarm", value: toAlarm(row) };
  bus.emit(channel(row.room_id), event);
}

// Geeft elke gebeurtenis van een kamer, tot `signal` afbreekt (bv. de app sluit de verbinding).
// Luistert al vanaf de aanroep, zodat er niets verloren gaat tussen aanroepen en uitlezen.
export function subscribe(roomId: string, signal: AbortSignal): AsyncGenerator<RoomEvent> {
  const events = on(bus, channel(roomId), { signal });

  return (async function* () {
    try {
      for await (const [event] of events) {
        yield event as RoomEvent;
      }
    } catch (error) {
      if (signal.aborted) return; // de verbinding is gesloten, dat is geen fout
      throw error;
    }
  })();
}
