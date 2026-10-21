# proto

Het gRPC-contract (`.proto`-bestanden) tussen de Raspberry Pi en de app.

Dit is de enige bron van waarheid: zowel [`/pi`](../pi) als [`/app`](../app) genereren hun code uit deze bestanden. Pas je het contract aan, dan zien beide kanten dat meteen.

## Bestanden

```
proto/
  restwell/v1/restwell.proto   ← de service RestWellService en alle messages
```

De map volgt de package-naam (`restwell.v1`). Een brekende wijziging komt later in een nieuwe versie (`v2`), zodat oude code blijft werken.

## Overzicht van RestWellService

| RPC | Soort | Wat |
| --- | --- | --- |
| `ListRooms` | gewoon | Alle kamers |
| `ListThresholds` | gewoon | Drempels van een kamer, bv. voor de comfortzone in de app |
| `UpdateThreshold` | gewoon | Eén drempel aanpassen. Geeft de volledige nieuwe drempel mee: een leeg veld is "geen grens". Lege actieve uren blijven ongewijzigd |
| `WatchRoom` | **live** (server-streaming) | Elke nieuwe meting en elke alarmwijziging van een kamer |
| `ListReadings` | gewoon | Metingen vanaf een tijdstip, voor grafieken |
| `ListOpenAlarms` | gewoon | Alarmen die aandacht vragen: nog niet opgelost, of opgelost maar nog niet gezien |
| `ListAlarms` | gewoon | Alarmgeschiedenis: elk alarm dat sinds een tijdstip liep, ook opgeloste en geziene, nieuwste eerst |
| `AcknowledgeAlarm` | gewoon | "Ik heb het gezien": stopt de buzzer |

Een alarm doorloopt: `ACTIVE` → `ACKNOWLEDGED` (iemand duidde "gezien" aan) → `RESOLVED` (waarde weer normaal).

Komt de waarde terug normaal voor iemand het alarm zag, dan wordt het `RESOLVED` zonder `acknowledged_at_ms`. Zo'n alarm blijft in `ListOpenAlarms` staan tot iemand op "gezien" tikt: geen enkel alarm verdwijnt ongezien.

## Afspraken

- De velden en enum-waarden komen overeen met de database. Zie de comments in het `.proto`-bestand voor de koppeling met kolommen en tekstwaarden.
- Tijdstippen zijn Unix-tijd in milliseconden, UTC.
- Klopt iets niet meer met de database, de backend of de app? Meld het en stel een aanpassing voor; zie [AGENTS.md](../AGENTS.md#afwijkingen-van-het-contract-melden).
