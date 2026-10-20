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
  deploy/        ← RestWell als service op de Pi laten draaien (zie "Op de Pi laten draaien")
```

Elke map heeft een eigen README met wat ze doet en wat ze aanbiedt.

## Opstarten

Vereist Node.js 24 (`nvm use` leest `.nvmrc`). Alle commando's voer je uit in `pi/`.

```bash
npm install         # dependencies installeren
npm run dev         # RestWell starten op de Pi, met de echte sensoren
npm run dev:fake    # RestWell starten zonder Pi, met nep-hardware (laptop)
npm run hardware:check  # sensoren uitlezen en tonen op terminal en OLED (zie src/hardware/README.md)
npm test            # tests (node:test, bestanden *.test.ts)
npm run lint        # ESLint
npm run format      # Prettier: code formatteren
npm run typecheck   # tsc: types controleren
npm run generate    # Buf: code (.js + .d.ts) genereren uit /proto naar src/grpc/generated/
```

De gegenereerde code staat niet in git. Draai `npm run generate` na een clone en na elke wijziging in `/proto`.

Node voert de `.ts`-bestanden rechtstreeks uit, er is geen build-stap. Gebruik daarom alleen TypeScript-syntax die Node kan weglaten (geen `enum` of `namespace`), en importeer met de extensie: `import { x } from "./x.ts"`.

Een library toevoegen doe je met `npm install <naam>`: de versie wordt automatisch exact gepind.

## Op de Pi laten draaien (service)

Voor de demo draait RestWell als systemd-service: het start vanzelf als de Pi opstart en herstart na een crash. Je hoeft geen terminal open te houden.

Eenmalig installeren, als de gewone gebruiker (het script vraagt zelf om het sudo-wachtwoord):

```bash
npm install                        # in pi/, als dat nog niet gebeurd is
bash deploy/install-service.sh     # schrijft /etc/systemd/system/restwell.service en start RestWell
```

Het script vult het pad van de repo, de gebruiker en nvm in `deploy/restwell.service` in. Node start via `nvm-exec`, dat de versie uit `.nvmrc` kiest.

| Wat                                | Commando                                |
| ---------------------------------- | --------------------------------------- |
| Draait het?                        | `systemctl status restwell`             |
| Logs volgen                        | `journalctl -u restwell -f`             |
| Herstarten (bv. na een `git pull`) | `sudo systemctl restart restwell`       |
| Tijdelijk stoppen                  | `sudo systemctl stop restwell`          |
| Niet meer automatisch starten      | `sudo systemctl disable --now restwell` |

**Stop de service voor je `npm run dev` of `npm run hardware:check` start.** Anders gebruiken twee programma's tegelijk de sensoren en poort 8080.

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
