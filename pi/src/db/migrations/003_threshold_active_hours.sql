-- Actieve uren per drempel: de regel geldt alleen van active_from_hour tot active_to_hour
-- (lokale tijd, het eind-uur zelf niet meer). Loopt over middernacht als from > to, bv. 22 tot 7.
-- Beide leeg = de regel geldt altijd.

ALTER TABLE thresholds ADD COLUMN active_from_hour INTEGER
  CHECK (active_from_hour BETWEEN 0 AND 23);
ALTER TABLE thresholds ADD COLUMN active_to_hour INTEGER
  CHECK (active_to_hour BETWEEN 0 AND 23);

-- Licht 's nachts verstoort de slaap; overdag is licht normaal. Voor bestaande databases:
-- een nieuwe database krijgt dit venster via seed.ts.
UPDATE thresholds SET active_from_hour = 22, active_to_hour = 7 WHERE sensor = 'light';
