# alarms

**Verantwoordelijke:** backend

Beslist wanneer een meting afwijkt en er een alarm moet komen. Dit is de kern van RestWell: alarmeer **alleen** als er echt iets mis is.

## Wat deze map aanbiedt

Importeer alleen uit `alarms/index.ts`. Geen enkele functie schrijft iets weg: ze krijgen gegevens binnen en geven een beslissing terug.

| Functie                                                                              | Wat ze doet                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `evaluateMeasurement({ measurement, thresholds, openAlarms, exceededSince, nowMs })` | Geeft `alarmsToCreate`, `alarmIdsToResolve` en een bijgewerkte `exceededSince` terug |
| `decideRoomOutput(openAlarms, nowMs)`                                                | `{ led, buzzer, displayText }` voor de kamer                                         |
| `roomLevel(openAlarms)`                                                              | `"green"`, `"orange"` of `"red"`                                                     |
| `mostImportantAlarm(openAlarms)`                                                     | Het alarm dat de OLED toont                                                          |
| `checkThreshold(value, threshold)` / `formatReason(sensor, direction, value)`        | Hulpfuncties, bv. "Te warm: 27,4 °C"                                                 |

`exceededSince` is een `Map` die per sensor onthoudt sinds wanneer de waarde buiten de drempel zit. De aanroeper (`main.ts`) bewaart die tussen twee metingen en geeft ze telkens opnieuw mee.

### Gebruik per meting (in `main.ts`)

```ts
const result = evaluateMeasurement({ measurement, thresholds, openAlarms, exceededSince, nowMs });
result.alarmsToCreate.forEach((alarm) => createAlarm(db, alarm));
result.alarmIdsToResolve.forEach((id) => resolveAlarm(db, id, nowMs));
exceededSince = result.exceededSince;
const output = decideRoomOutput(listOpenAlarms(db, roomId), nowMs); // naar LED, buzzer en OLED
```

## Regels

- **Nieuw alarm:** de waarde ligt buiten de drempel en er is nog geen open alarm voor die sensor. Met `max_duration_sec` moet ze langer dan die tijd buiten de drempel blijven (licht 60 s, geluid 5 s).
- **Opgelost:** de waarde is weer normaal. Dat geldt ook voor een bevestigd alarm.
- **Geen waarde (`null`):** er verandert niets. **Beweging:** nooit een alarm, enkel gelogd.
- **LED:** aan bij elk open alarm. **Buzzer:** een actief alarm dat ouder is dan `buzzer_after_sec`. **OLED:** reden van het belangrijkste alarm (eerst actieve, dan het oudste), anders "Alles OK".
- **Niveau:** rood bij minstens één actief alarm, oranje als er alleen bevestigde zijn, anders groen.

## Afspraken

- Drempelwaarden staan in de database (tabel `thresholds`, gevuld door `db/seed.ts`), niet hardgecodeerd in deze map.
- Pure logica zonder hardware of database: geef een meting in, krijg een alarm (of niets) terug. Zo is alles makkelijk te testen.
- Denk aan valse alarmen: één uitschieter is nog geen probleem (bv. pas alarmeren als een waarde een tijd te hoog blijft).
