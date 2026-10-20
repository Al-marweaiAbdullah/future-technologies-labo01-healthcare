# db

**Verantwoordelijke:** backend

De opslag van kamers, metingen, drempels en alarmen in SQLite.

## Wat deze map aanbiedt

Importeer alleen uit `db/index.ts`. Elke functie krijgt de databaseverbinding als eerste parameter, zodat tests een database in het geheugen kunnen gebruiken.

```ts
import { openDatabase, seedDefaults, saveMeasurement } from "./db/index.ts";
```

| Functie                                       | Wat ze doet                                                                                                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openDatabase(path)`                          | Opent de database (of `IN_MEMORY`), zet WAL en foreign keys aan en voert de migraties uit                                                                                                           |
| `seedDefaults(db)`                            | Maakt `room1` ("Kamer 1") en de standaarddrempels aan als ze nog niet bestaan                                                                                                                       |
| `listRooms(db)` / `getRoom(db, roomId)`       | Kamers opvragen                                                                                                                                                                                     |
| `saveMeasurement(db, measurement)`            | Meting opslaan, geeft de rij met `id` terug                                                                                                                                                         |
| `getLatestMeasurement(db, roomId)`            | Laatste meting van een kamer, of `undefined`                                                                                                                                                        |
| `listMeasurements(db, roomId, fromMs, toMs)`  | Metingen in een periode, oudste eerst (voor grafieken)                                                                                                                                              |
| `listThresholds(db, roomId)`                  | Drempels van een kamer                                                                                                                                                                              |
| `updateThreshold(db, roomId, sensor, values)` | Past een drempel aan (`min_value`, `max_value`, `max_duration_sec`; `null` = geen grens). Geeft de drempel terug, of `undefined` als die niet bestaat. Gooit een `RangeError` bij ongeldige waarden |
| `createAlarm(db, alarm)`                      | Nieuw alarm met status `active`                                                                                                                                                                     |
| `getAlarm(db, alarmId)`                       | Eén alarm op id, in elke status, of `undefined`                                                                                                                                                     |
| `listOpenAlarms(db, roomId)`                  | Alarmen die nog niet opgelost zijn (`active` of `acknowledged`)                                                                                                                                     |
| `listAlarmsToShow(db, roomId)`                | Wat de app toont: open alarmen, plus opgeloste alarmen die nog niemand gezien heeft                                                                                                                 |
| `getOpenAlarmForSensor(db, roomId, sensor)`   | Het open alarm van één sensor, of `undefined`                                                                                                                                                       |
| `acknowledgeAlarm(db, alarmId, by, nowMs)`    | Nog niet gezien → gezien: `active` wordt `acknowledged`, `resolved` blijft `resolved` maar krijgt wie en wanneer. Geeft het alarm terug, of `undefined`                                             |
| `resolveAlarm(db, alarmId, nowMs)`            | Open alarm → `resolved`. Geeft het alarm terug, of `undefined`                                                                                                                                      |

De types (`RoomRow`, `MeasurementRow`, `AlarmRow`, ...) staan in `types.ts` en worden ook via `index.ts` geëxporteerd. Ze beschrijven de rijen in de database. Naar de app gaan de types uit `/proto`.

## Database en configuratie

- Het bestand staat standaard in `pi/data/restwell.db`. Een ander pad kies je met de omgevingsvariabele `RESTWELL_DB_PATH` (zie `src/config.ts`).
- Tijdstippen zijn Unix-tijd in milliseconden (UTC).
- `light_raw` is de ruwe waarde van de lichtsensor: 0 (donker) tot 1023 (fel licht). De drempel in `seed.ts` is 900: gewoon kamerlicht gaf bij het testen ±765.
- Er is geen geluidssensor: migratie `002_remove_sound.sql` haalt geluid uit de database.

## Drempels en bronnen

De standaarddrempels staan in `seed.ts` en worden in de tabel `thresholds` gezet. Ze zijn per kamer aanpasbaar met `updateThreshold`, zonder de code te wijzigen. `main.ts` leest ze bij elke meting, dus een wijziging werkt meteen.

| Sensor      | Drempel                            | Bron en motivatie                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Temperatuur | 18–24 °C                           | De WHO [Housing and health guidelines (2018)](https://www.ncbi.nlm.nih.gov/books/NBK535294/) gebruiken 18 °C als minimum binnentemperatuur. De ondergrens van 18 °C komt van een eerdere WHO-werkgroep, die 18–24 °C geen aantoonbaar risico vond voor gezonde mensen in rust ([samenvatting, PMC7689703](https://pmc.ncbi.nlm.nih.gov/articles/PMC7689703)).                                                                                                                               |
| Vochtigheid | 30–60 %                            | De EPA raadt aan de relatieve vochtigheid binnen onder 60 % te houden, ideaal tussen 30 en 50 %, om schimmel te vermijden ([EPA, Mold course chapter 2](https://19january2025snapshot.epa.gov/mold/mold-course-chapter-2/index.html)). Onder 30 % wordt de lucht te droog.                                                                                                                                                                                                                  |
| Licht       | ruwe waarde > 900, langer dan 60 s | Licht 's nachts verstoort de slaap van patiënten: in een ICU-studie zegt een derde van de patiënten dat licht 's nachts hun slaap stoort ([Journal of Patient Experience, 2021](https://doaj.org/article/7c9e742aa29c46748297efb2a5365a5f)), en al 5–10 lux 's nachts verandert de slaapstructuur ([PMC8174656](https://pmc.ncbi.nlm.nih.gov/articles/PMC8174656)). De sensor geeft geen lux: 900 ligt boven gewoon kamerlicht (±765, zelf gemeten). De 60 s is kort gehouden voor de demo. |

Dit is een prototype: de drempels zijn een onderbouwd vertrekpunt, geen medisch advies.

## Afspraken

- Dit is de **enige** plek waar SQL staat. Altijd geparametriseerde queries.
- Schemawijzigingen gaan via genummerde migraties in `migrations/` (`001_init.sql`, `002_...`). Een gemergede migratie pas je nooit meer aan. `PRAGMA user_version` onthoudt welke al uitgevoerd zijn.
- Tests gebruiken `IN_MEMORY`, nooit een bestand.
- Zie [AGENTS.md](../../../AGENTS.md#codekwaliteit-per-onderdeel) voor de SQLite-regels.
