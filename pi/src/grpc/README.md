# grpc

**Verantwoordelijke:** proto/gRPC

De gRPC-server waarmee de app gegevens van de Pi opvraagt. Deze map voert het contract uit [`/proto`](../../../proto) uit.

## Wat deze map doet

- de services uit de `.proto`-bestanden implementeren
- gegevens ophalen via `db/` en `alarms/` en ze in het formaat van het contract teruggeven

De server gebruikt [Connect](https://connectrpc.com/). Die spreekt over gewone HTTP het Connect- en gRPC-Web-protocol, zodat de Lynx-app hem met `fetch` kan aanroepen.

## Bestanden

| Bestand      | Wat                                                                        |
| ------------ | -------------------------------------------------------------------------- |
| `index.ts`   | Wat deze map aanbiedt aan de rest van de Pi-code. Importeer alleen hieruit |
| `server.ts`  | `startGrpcServer(db, port)`: start de HTTP-server                          |
| `service.ts` | De RPC's uit het contract, met de gegevens uit `db/`                       |
| `mapping.ts` | Zet databaserijen om naar de types uit het contract                        |
| `events.ts`  | Meldingsbus voor de live-stroom `WatchRoom`                                |
| `generated/` | Gegenereerd uit `/proto` met `npm run generate`, niet in git               |

## Live data melden

`WatchRoom` stuurt alleen wat op de meldingsbus komt. **Wie een meting of alarm opslaat of wijzigt, meldt het meteen daarna:**

```ts
import { publishAlarm, publishMeasurement } from "../grpc/index.ts";

publishMeasurement(saveMeasurement(db, measurement));
publishAlarm(createAlarm(db, alarm));
```

## Testen zonder Pi

```bash
npm run dev:fake
```

Start RestWell met nep-hardware, de server op poort 8080 (te wijzigen met `RESTWELL_GRPC_PORT`) en de database in `pi/data/restwell.db`. Elke 2 seconden komt er een nepmeting (te wijzigen met `RESTWELL_SAMPLE_INTERVAL_MS`). Die wordt opgeslagen en door `alarms/` gecontroleerd, dus de alarmen komen uit de echte drempels. De nep-temperatuur schommelt tussen 17 en 25 °C, zodat je af en toe een alarm ziet. Op de Pi start `npm run dev` hetzelfde met de echte sensoren.

Een gewone call met curl:

```bash
curl -X POST http://localhost:8080/restwell.v1.RestWellService/ListRooms -H "Content-Type: application/json" -d "{}"
```

## AcknowledgeAlarm

"Ik heb het gezien": zet een actief alarm op `ACKNOWLEDGED` en meldt het via `WatchRoom` aan alle telefoons. De buzzer stopt bij de volgende meting (binnen ±2 s); de LED en de tekst op de OLED blijven tot de waarde weer normaal is.

| Situatie                            | Antwoord                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Actief alarm                        | Het bijgewerkte alarm                                                     |
| Al bevestigd (bv. door een collega) | Het alarm, ongewijzigd: de eerste bevestiging blijft staan                |
| Al opgelost                         | `FAILED_PRECONDITION`                                                     |
| Onbekend alarm                      | `NOT_FOUND`                                                               |
| Lege `acknowledged_by`              | `INVALID_ARGUMENT`. Vul initialen of een rol in, nooit een volledige naam |

```bash
curl -X POST http://localhost:8080/restwell.v1.RestWellService/AcknowledgeAlarm -H "Content-Type: application/json" -d '{"alarmId":"1","acknowledgedBy":"VP"}'
```

## Afspraken

- Geen businesslogica hier: deze map vertaalt alleen tussen het contract en de rest van de code.
- Gegenereerde code komt in een aparte map `generated/` en wordt nooit met de hand aangepast.
- Een wijziging aan het contract gebeurt eerst in `/proto`, in overleg met de Lynx-app. Zie [AGENTS.md](../../../AGENTS.md#wijzigingen-aan-het-contract-proto).
