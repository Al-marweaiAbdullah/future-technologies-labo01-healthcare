# grpc

**Verantwoordelijke:** proto/gRPC

De gRPC-server waarmee de app gegevens van de Pi opvraagt. Deze map voert het contract uit [`/proto`](../../../proto) uit.

## Wat deze map doet

- de services uit de `.proto`-bestanden implementeren
- gegevens ophalen via `db/` en `alarms/` en ze in het formaat van het contract teruggeven

De server gebruikt [Connect](https://connectrpc.com/). Die spreekt over gewone HTTP het Connect- en gRPC-Web-protocol, zodat de Lynx-app hem met `fetch` kan aanroepen.

## Bestanden

| Bestand                       | Wat                                                                        |
| ----------------------------- | -------------------------------------------------------------------------- |
| `index.ts`                    | Wat deze map aanbiedt aan de rest van de Pi-code. Importeer alleen hieruit |
| `server.ts`                   | `startGrpcServer(db, port)`: start de HTTP-server                          |
| `service.ts`                  | De RPC's uit het contract, met de gegevens uit `db/`                       |
| `mapping.ts`                  | Zet databaserijen om naar de types uit het contract                        |
| `events.ts`                   | Meldingsbus voor de live-stroom `WatchRoom`                                |
| `fake-data.ts`, `dev-fake.ts` | Nepdata om te testen zonder sensoren                                       |
| `generated/`                  | Gegenereerd uit `/proto` met `npm run generate`, niet in git               |

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

Start de server op poort 8080 (te wijzigen met `RESTWELL_GRPC_PORT`) met een database in het geheugen. Elke seconde komt er een nepmeting bij, en een alarm zodra de temperatuur boven 24 °C komt.

Een gewone call met curl:

```bash
curl -X POST http://localhost:8080/restwell.v1.RestWellService/ListRooms -H "Content-Type: application/json" -d "{}"
```

## Afspraken

- Geen businesslogica hier: deze map vertaalt alleen tussen het contract en de rest van de code.
- Gegenereerde code komt in een aparte map `generated/` en wordt nooit met de hand aangepast.
- Een wijziging aan het contract gebeurt eerst in `/proto`, in overleg met de Lynx-app. Zie [AGENTS.md](../../../AGENTS.md#wijzigingen-aan-het-contract-proto).
