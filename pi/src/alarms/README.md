# alarms

**Verantwoordelijke:** backend

Beslist wanneer een meting afwijkt en er een alarm moet komen. Dit is de kern van KamerWacht: alarmeer **alleen** als er echt iets mis is.

## Wat deze map aanbiedt

Bijvoorbeeld:

```ts
checkMeasurement(measurement): Alarm | null
```

## Afspraken

- Drempelwaarden (bv. maximumtemperatuur) staan in de configuratie, niet hardgecodeerd.
- Pure logica zonder hardware of database: geef een meting in, krijg een alarm (of niets) terug. Zo is alles makkelijk te testen.
- Denk aan valse alarmen: één uitschieter is nog geen probleem (bv. pas alarmeren als een waarde een tijd te hoog blijft).
