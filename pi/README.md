# pi

Alles wat op de **Raspberry Pi** draait: hardware, backend en gRPC-server, samen in één Node.js-programma (TypeScript, met SQLite als database).

De map heet `pi` omdat alles hierin op de Pi draait, niet omdat het één taak is. Binnenin heeft elke taak een eigen map:

```
pi/
  src/
    hardware/    ← hardware: sensoren uitlezen, OLED aansturen
    db/          ← backend: opslag in SQLite
    alarms/      ← backend: beslissen wanneer er een alarm komt
    grpc/        ← proto/gRPC: server die het contract uit /proto uitvoert
    main.ts      ← start alles en koppelt de onderdelen aan elkaar
```

Elke map heeft een eigen README met wat ze doet en wat ze aanbiedt. `main.ts` en de `package.json` komen er zodra de tooling gekozen is.

## Hoe de onderdelen samenwerken

```
sensoren → hardware/ → main.ts → db/      (opslaan)
                              → alarms/  (afwijking?)
                                   ↓
                app ← grpc/ ← db/ + alarms/
```

1. `hardware/` leest de sensoren uit en geeft meetwaarden terug.
2. `main.ts` slaat elke meting op via `db/` en laat `alarms/` controleren of ze afwijkt.
3. `grpc/` haalt metingen en alarmen op uit `db/` en `alarms/` en stuurt ze naar de app.

## Regels voor samenwerken

- **Elke map gebruikt de andere alleen via haar functies.** Gebruik geen interne bestanden van een andere map.
- **Spreek de functies tussen de mappen vroeg af** (bv. `readTemperatureC(): Promise<number>`). Dan kan iedereen tegelijk werken: zolang de hardware niet klaar is, gebruikt de backend een nep-sensor.
- `hardware/` en `grpc/` bevatten geen businesslogica. Die zit in `db/` en `alarms/`.

Zie [AGENTS.md](../AGENTS.md) voor de regels voor codekwaliteit en SQLite.
