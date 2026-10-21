import type { Db } from "./connection.ts";
import type { RoomRow, ThresholdRow } from "./types.ts";

export const DEFAULT_ROOM: RoomRow = { id: "room1", name: "Kamer 1" };

// Licht: ruwe waarde 0-1023. Gewoon kamerlicht gaf bij het testen ±765; pas daarboven is het te fel.
const LIGHT_MAX_RAW = 900;
const LIGHT_MAX_DURATION_SEC = 60; // kort gehouden voor de demo
// Het lichtalarm geldt alleen 's nachts: van 22:00 tot 07:00 (lokale tijd).
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 7;

const ALWAYS_ACTIVE = { active_from_hour: null, active_to_hour: null };

// Bronnen voor elke drempel: zie "Drempels en bronnen" in db/README.md.
const DEFAULT_THRESHOLDS: Omit<ThresholdRow, "room_id">[] = [
  // WHO Housing and health guidelines (2018): minimum 18 °C, 18-24 °C geen aantoonbaar risico.
  { sensor: "temperature", min_value: 18, max_value: 24, max_duration_sec: null, ...ALWAYS_ACTIVE },
  // EPA: relatieve vochtigheid binnen onder 60 %, ideaal 30-50 %.
  { sensor: "humidity", min_value: 30, max_value: 60, max_duration_sec: null, ...ALWAYS_ACTIVE },
  // Licht 's nachts verstoort de slaap van patiënten (ICU-studies, zie README).
  {
    sensor: "light",
    min_value: null,
    max_value: LIGHT_MAX_RAW,
    max_duration_sec: LIGHT_MAX_DURATION_SEC,
    active_from_hour: NIGHT_START_HOUR,
    active_to_hour: NIGHT_END_HOUR,
  },
  // beweging heeft geen drempel: die wordt enkel gelogd
];

// Maakt de standaardkamer en haar drempels aan. Bestaan ze al, dan blijven ze ongewijzigd.
export function seedDefaults(db: Db): void {
  const insertRoom = db.prepare("INSERT OR IGNORE INTO rooms (id, name) VALUES (:id, :name)");
  const insertThreshold = db.prepare(
    `INSERT OR IGNORE INTO thresholds
       (room_id, sensor, min_value, max_value, max_duration_sec, active_from_hour, active_to_hour)
     VALUES
       (:room_id, :sensor, :min_value, :max_value, :max_duration_sec, :active_from_hour, :active_to_hour)`,
  );

  db.transaction(() => {
    insertRoom.run(DEFAULT_ROOM);
    for (const threshold of DEFAULT_THRESHOLDS) {
      insertThreshold.run({ room_id: DEFAULT_ROOM.id, ...threshold });
    }
  })();
}
