# grpc

**Verantwoordelijke:** proto/gRPC

De gRPC-server waarmee de app gegevens van de Pi opvraagt. Deze map voert het contract uit [`/proto`](../../../proto) uit.

## Wat deze map doet

- de services uit de `.proto`-bestanden implementeren
- gegevens ophalen via `db/` en `alarms/` en ze in het formaat van het contract teruggeven

## Afspraken

- Geen businesslogica hier: deze map vertaalt alleen tussen het contract en de rest van de code.
- Gegenereerde code komt in een aparte map `generated/` en wordt nooit met de hand aangepast.
- Een wijziging aan het contract gebeurt eerst in `/proto`, in overleg met de Lynx-app. Zie [AGENTS.md](../../../AGENTS.md#wijzigingen-aan-het-contract-proto).
