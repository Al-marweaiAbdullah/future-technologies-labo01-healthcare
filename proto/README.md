# proto

Het gRPC-contract (`.proto`-bestanden) tussen de Raspberry Pi en de app.

Dit is de enige bron van waarheid: zowel [`/pi`](../pi) als [`/app`](../app) genereren hun code uit deze bestanden. Pas je het contract aan, dan zien beide kanten dat meteen.

## Bestanden

```
proto/
  kamerwacht/v1/kamerwacht.proto   ← de service KamerWachtService en alle messages
```

De map volgt de package-naam (`kamerwacht.v1`). Een brekende wijziging komt later in een nieuwe versie (`v2`), zodat oude code blijft werken.

## Overzicht van KamerWachtService

| RPC | Soort | Wat |
| --- | --- | --- |
| `ListRooms` | gewoon | Alle kamers |
| `WatchRoom` | **live** (server-streaming) | Elke nieuwe meting en elke alarmwijziging van een kamer |
| `ListReadings` | gewoon | Metingen vanaf een tijdstip, voor grafieken |
| `ListOpenAlarms` | gewoon | Alarmen die nog niet opgelost zijn |
| `AcknowledgeAlarm` | gewoon | "Ik heb het gezien": stopt de buzzer |

Een alarm doorloopt: `ACTIVE` → `ACKNOWLEDGED` (iemand duidde "gezien" aan) → `RESOLVED` (waarde weer normaal).

## Afspraken

- De velden en enum-waarden komen overeen met de database. Zie de comments in het `.proto`-bestand voor de koppeling met kolommen en tekstwaarden.
- Tijdstippen zijn Unix-tijd in milliseconden, UTC.
- Klopt iets niet meer met de database, de backend of de app? Meld het en stel een aanpassing voor; zie [AGENTS.md](../AGENTS.md#afwijkingen-van-het-contract-melden).
