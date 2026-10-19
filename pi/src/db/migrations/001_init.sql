-- Eerste schema van RestWell.
-- Tijdstippen zijn Unix-tijd in milliseconden (UTC).
-- Pas dit bestand na de merge nooit meer aan: voeg een 002_...sql toe.

CREATE TABLE rooms (
  id   TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE measurements (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id          TEXT    NOT NULL REFERENCES rooms(id),
  timestamp_ms     INTEGER NOT NULL,
  temperature_c    REAL,
  humidity_percent REAL,
  light_raw        INTEGER,  -- ruwe sensorwaarde, eenheid af te spreken met hardware
  sound_raw        INTEGER,  -- ruwe sensorwaarde, enkel een niveau, nooit audio
  motion           INTEGER CHECK (motion IN (0, 1))
);

CREATE INDEX idx_measurements_room_time ON measurements(room_id, timestamp_ms);

CREATE TABLE thresholds (
  room_id          TEXT NOT NULL REFERENCES rooms(id),
  sensor           TEXT NOT NULL
                   CHECK (sensor IN ('temperature', 'humidity', 'light', 'sound', 'motion')),
  min_value        REAL,     -- in de eenheid van de sensor (zie measurements)
  max_value        REAL,
  max_duration_sec INTEGER,  -- pas alarmeren als de waarde zo lang buiten de drempel blijft
  PRIMARY KEY (room_id, sensor)
);

CREATE TABLE alarms (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id            TEXT    NOT NULL REFERENCES rooms(id),
  sensor             TEXT    NOT NULL
                     CHECK (sensor IN ('temperature', 'humidity', 'light', 'sound', 'motion')),
  value              REAL,
  reason             TEXT    NOT NULL,
  started_at_ms      INTEGER NOT NULL,
  buzzer_after_sec   INTEGER NOT NULL DEFAULT 60,
  status             TEXT    NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_at_ms INTEGER,
  acknowledged_by    TEXT,   -- initialen of rol, nooit een volledige naam
  resolved_at_ms     INTEGER
);
