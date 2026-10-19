# db

**Verantwoordelijke:** backend

De opslag van metingen en alarmen in SQLite.

## Wat deze map aanbiedt

Functies om op te slaan en op te vragen, zonder dat de rest van de code SQL moet schrijven. Bijvoorbeeld:

```ts
saveMeasurement(measurement): void
getLatestMeasurements(): Measurement[]
getMeasurementsSince(timestamp): Measurement[]
```

## Afspraken

- Dit is de **enige** plek waar SQL staat.
- Schemawijzigingen gaan via genummerde migraties in `migrations/` (`001_init.sql`, `002_...`).
- Zie [AGENTS.md](../../../AGENTS.md#codekwaliteit-per-onderdeel) voor de SQLite-regels.
