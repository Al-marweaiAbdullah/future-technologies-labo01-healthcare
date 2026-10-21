# alarms

**Verantwoordelijke:** backend

Beslist wanneer een meting afwijkt en er een alarm moet komen. Dit is de kern van RestWell: alarmeer **alleen** als er echt iets mis is.

## Wat deze map aanbiedt

Importeer alleen uit `alarms/index.ts`. Geen enkele functie schrijft iets weg: ze krijgen gegevens binnen en geven een beslissing terug.

| Functie                                                                                         | Wat ze doet                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `evaluateMeasurement({ measurement, thresholds, openAlarms, exceededSince, nowMs, localHour })` | Geeft `alarmsToCreate`, `alarmIdsToResolve` en een bijgewerkte `exceededSince` terug                                         |
| `evaluateSensorHealth({ measurement, openAlarms, missingSince, nowMs })`                        | Geeft `alarmsToCreate`, `alarmIdsToResolve` en een bijgewerkte `missingSince` terug voor sensoren die geen waarde meer geven |
| `decideRoomOutput(openAlarms, nowMs)`                                                           | `{ led, buzzer, displayText }` voor de kamer                                                                                 |
| `roomLevel(openAlarms)`                                                                         | `"green"`, `"orange"` of `"red"`                                                                                             |
| `mostImportantAlarm(openAlarms)`                                                                | Het alarm dat de OLED toont                                                                                                  |
| `checkThreshold(value, threshold)` / `formatReason(sensor, direction, value)`                   | Hulpfuncties, bv. "Te warm: 27,4 °C"                                                                                         |

`exceededSince` is een `Map` die per sensor onthoudt sinds wanneer de waarde buiten de drempel zit. De aanroeper (`main.ts`) bewaart die tussen twee metingen en geeft ze telkens opnieuw mee.

`missingSince` werkt hetzelfde: een `Map` die per sensor onthoudt sinds wanneer er geen waarde meer is. Ook die bewaart `main.ts` tussen twee metingen. Roep `evaluateSensorHealth` naast `evaluateMeasurement` aan, met dezelfde meting en dezelfde open alarmen.

### Gebruik per meting (in `main.ts`)

```ts
const localHour = new Date(nowMs).getHours(); // lokale tijd van de Pi
const result = evaluateMeasurement({
  measurement,
  thresholds,
  openAlarms,
  exceededSince,
  nowMs,
  localHour,
});
result.alarmsToCreate.forEach((alarm) => createAlarm(db, alarm));
result.alarmIdsToResolve.forEach((id) => resolveAlarm(db, id, nowMs));
exceededSince = result.exceededSince;
const output = decideRoomOutput(listOpenAlarms(db, roomId), nowMs); // naar LED, buzzer en OLED
```

## Regels

- **Nieuw alarm:** de waarde ligt buiten de drempel en er is nog geen open alarm voor die sensor. Met `max_duration_sec` moet ze langer dan die tijd buiten de drempel blijven (licht 60 s).
- **Opgelost:** de waarde is weer normaal. Dat geldt ook voor een bevestigd alarm.
- **Geen waarde (`null`):** `evaluateMeasurement` verandert niets. **Beweging:** nooit een drempelalarm, enkel gelogd.
- **Sensor offline:** geeft een sensor (ook beweging) langer dan `OFFLINE_AFTER_SEC` (120 s) onafgebroken geen waarde, dan maakt `evaluateSensorHealth` een alarm met `value = null` en de tekst "Temperatuursensor geeft geen waarde". Het alarm gebruikt de sensor die uitviel, dus er is geen nieuwe sensornaam, migratie of contractwijziging nodig. Zodra de sensor weer een waarde geeft, wordt het opgelost. Een alarm van deze regel herken je aan `value = null`; een drempelalarm heeft altijd een waarde.
  - Staat er al een open alarm voor die sensor (ook een drempelalarm), dan komt er geen tweede bij. Valt een sensor uit tijdens een open drempelalarm, dan volgt het offline-alarm pas als dat gesloten is.
  - Sluit `evaluateMeasurement` een alarm buiten de actieve uren (bv. 's morgens om 7 u voor licht), dan sluit dat ook een offline-alarm van die sensor. Blijft de sensor uit, dan volgt na `OFFLINE_AFTER_SEC` weer een nieuw alarm.
- **Actieve uren:** een drempel met `active_from_hour` en `active_to_hour` geldt alleen in dat venster (lokale tijd, eind-uur niet inbegrepen; 22 tot 7 loopt over middernacht). Daarbuiten start er geen alarm, stopt de teller en sluit een open alarm. Zo geeft licht alleen 's nachts een alarm. Zonder `localHour` gelden alle regels altijd. `isActiveAtHour(threshold, hour)` controleert één uur.
- **LED:** aan bij elk open alarm. **Buzzer:** een actief alarm dat ouder is dan `buzzer_after_sec`. **OLED:** reden van het belangrijkste alarm (eerst actieve, dan het oudste), anders "Alles OK".
- **Niveau:** rood bij minstens één actief alarm, oranje als er alleen bevestigde zijn, anders groen.

## Afspraken

- Drempelwaarden staan in de database (tabel `thresholds`, gevuld door `db/seed.ts`), niet hardgecodeerd in deze map.
- Pure logica zonder hardware of database: geef een meting in, krijg een alarm (of niets) terug. Zo is alles makkelijk te testen.
- Denk aan valse alarmen: één uitschieter is nog geen probleem (bv. pas alarmeren als een waarde een tijd te hoog blijft).
