-- Geluid verdwijnt uit RestWell: er is geen geluidssensor.
-- Pas dit bestand na de merge nooit meer aan: voeg een 003_...sql toe.

ALTER TABLE measurements DROP COLUMN sound_raw;

-- SQLite kan een CHECK niet aanpassen: tabel opnieuw opbouwen zonder 'sound'.
CREATE TABLE thresholds_new (
  room_id          TEXT NOT NULL REFERENCES rooms(id),
  sensor           TEXT NOT NULL
                   CHECK (sensor IN ('temperature', 'humidity', 'light', 'motion')),
  min_value        REAL,     -- in de eenheid van de sensor (zie measurements)
  max_value        REAL,
  max_duration_sec INTEGER,  -- pas alarmeren als de waarde zo lang buiten de drempel blijft
  PRIMARY KEY (room_id, sensor)
);
INSERT INTO thresholds_new SELECT * FROM thresholds WHERE sensor <> 'sound';
DROP TABLE thresholds;
ALTER TABLE thresholds_new RENAME TO thresholds;

CREATE TABLE alarms_new (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id            TEXT    NOT NULL REFERENCES rooms(id),
  sensor             TEXT    NOT NULL
                     CHECK (sensor IN ('temperature', 'humidity', 'light', 'motion')),
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
INSERT INTO alarms_new SELECT * FROM alarms WHERE sensor <> 'sound';
DROP TABLE alarms;
ALTER TABLE alarms_new RENAME TO alarms;
