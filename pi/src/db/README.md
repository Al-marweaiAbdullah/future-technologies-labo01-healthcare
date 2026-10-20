# db

**Verantwoordelijke:** backend

De opslag van kamers, metingen, drempels en alarmen in SQLite.

## Wat deze map aanbiedt

Importeer alleen uit `db/index.ts`. Elke functie krijgt de databaseverbinding als eerste parameter, zodat tests een database in het geheugen kunnen gebruiken.

```ts
import { openDatabase, seedDefaults, saveMeasurement } from "./db/index.ts";
```

| Functie                                      | Wat ze doet                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `openDatabase(path)`                         | Opent de database (of `IN_MEMORY`), zet WAL en foreign keys aan en voert de migraties uit |
| `seedDefaults(db)`                           | Maakt `room1` ("Kamer 1") en de standaarddrempels aan als ze nog niet bestaan             |
| `listRooms(db)` / `getRoom(db, roomId)`      | Kamers opvragen                                                                           |
| `saveMeasurement(db, measurement)`           | Meting opslaan, geeft de rij met `id` terug                                               |
| `getLatestMeasurement(db, roomId)`           | Laatste meting van een kamer, of `undefined`                                              |
| `listMeasurements(db, roomId, fromMs, toMs)` | Metingen in een periode, oudste eerst (voor grafieken)                                    |
| `listThresholds(db, roomId)`                 | Drempels van een kamer                                                                    |
| `createAlarm(db, alarm)`                     | Nieuw alarm met status `active`                                                           |
| `listOpenAlarms(db, roomId)`                 | Alarmen die nog niet opgelost zijn (`active` of `acknowledged`)                           |
| `getOpenAlarmForSensor(db, roomId, sensor)`  | Het open alarm van één sensor, of `undefined`                                             |
| `getAlarm(db, alarmId)`                      | Eén alarm, ongeacht de status, of `undefined`                                             |
| `acknowledgeAlarm(db, alarmId, by, nowMs)`   | `active` → `acknowledged`. Geeft het alarm terug, of `undefined`                          |
| `resolveAlarm(db, alarmId, nowMs)`           | Open alarm → `resolved`. Geeft `false` als dat niet kon                                   |

De types (`RoomRow`, `MeasurementRow`, `AlarmRow`, ...) staan in `types.ts` en worden ook via `index.ts` geëxporteerd. Ze beschrijven de rijen in de database. Naar de app gaan de types uit `/proto`.

## Database en configuratie

- Het bestand staat standaard in `pi/data/restwell.db`. Een ander pad kies je met de omgevingsvariabele `RESTWELL_DB_PATH` (zie `src/config.ts`).
- Tijdstippen zijn Unix-tijd in milliseconden (UTC).
- `light_raw` is de ruwe waarde van de lichtsensor: 0 (donker) tot 1023 (fel licht). De drempel in `seed.ts` is 900: gewoon kamerlicht gaf bij het testen ±765.
- Er is geen geluidssensor: migratie `002_remove_sound.sql` haalt geluid uit de database.

## Afspraken

- Dit is de **enige** plek waar SQL staat. Altijd geparametriseerde queries.
- Schemawijzigingen gaan via genummerde migraties in `migrations/` (`001_init.sql`, `002_...`). Een gemergede migratie pas je nooit meer aan. `PRAGMA user_version` onthoudt welke al uitgevoerd zijn.
- Tests gebruiken `IN_MEMORY`, nooit een bestand.
- Zie [AGENTS.md](../../../AGENTS.md#codekwaliteit-per-onderdeel) voor de SQLite-regels.
