# Future Technologies – Labo 01 Healthcare

Dit project is een **monorepo**: het hele project zit in één repository, opgesplitst per onderdeel. Een verpleegkundige kan niet elke kamer permanent controleren. Toch beïnvloeden warmte, droge lucht, licht en lawaai het comfort, de slaap en het herstel van een patiënt. RestWell bewaakt dat automatisch en alarmeert alleen als er iets afwijkt.

## Stack

| Onderdeel    | Technologie                                           |
| ------------ | ----------------------------------------------------- |
| Hardware     | Raspberry Pi met sensoren en een OLED-scherm          |
| Backend      | TypeScript op Node.js                                 |
| Database     | SQLite (op de Pi)                                     |
| Frontend     | Lynx-app in TypeScript                                |
| Communicatie | gRPC, met het contract in Protocol Buffers (`.proto`) |

Gekozen voor `/pi`: Node.js 24, npm, `better-sqlite3`, `node:test`, ConnectRPC en Buf. Nog niet gekozen: de libraries voor de sensoren en het OLED-scherm. Zie [AGENTS.md](AGENTS.md#genomen-beslissingen).

## Structuur

De mappen bovenaan zijn ingedeeld volgens **waar de code draait**: op de Pi, op de telefoon, of gedeeld. Binnen `/pi` heeft elke taak een eigen map.

```
proto/              ← het gRPC-contract (.proto), gedeeld door Pi en app
pi/                 ← alles wat op de Raspberry Pi draait (één Node.js-programma)
  src/hardware/     ← sensoren uitlezen, OLED aansturen
  src/db/           ← opslag in SQLite
  src/alarms/       ← beslissen wanneer er een alarm komt
  src/grpc/         ← gRPC-server die het contract uitvoert
app/                ← de Lynx-app op de telefoon
```

`/proto` is de enige bron van waarheid voor de communicatie tussen Pi en app: verandert het contract, dan zien beide kanten dat meteen.

## Wie werkt waar

| Taak       | Werkt in                                                   |
| ---------- | ---------------------------------------------------------- |
| Hardware   | [`pi/src/hardware`](pi/src/hardware)                       |
| Backend    | [`pi/src/db`](pi/src/db), [`pi/src/alarms`](pi/src/alarms) |
| Proto/gRPC | [`proto`](proto), [`pi/src/grpc`](pi/src/grpc)             |
| Lynx       | [`app`](app)                                               |

Hoe de onderdelen op de Pi samenwerken, staat in [`pi/README.md`](pi/README.md).

## Privacy en ethiek

RestWell is een prototype voor een schoolproject en geen medisch hulpmiddel. We bewaken de **kamer**, niet de patiënt: we verzamelen alleen wat nodig is om te weten of het binnenklimaat het herstel kan verstoren.

### Welke data we verzamelen en waarom

| Gegeven                                  | Waarom                                                          | Detail                                                               |
| ---------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Temperatuur (°C) en luchtvochtigheid (%) | Te warm, te koud of te droog verstoort comfort en herstel       | DHT22-sensor, 1 decimaal                                             |
| Licht                                    | Licht 's nachts verstoort de slaap                              | Ruwe waarde 0–1023 van een lichtsensor (LDR), geen beeld             |
| Beweging                                 | Context: is er iemand in de kamer actief? Geeft nooit een alarm | Alleen **ja/nee** van een PIR-sensor, geen beeld en geen positie     |
| Tijdstip van elke meting                 | Grafieken, en weten hoe lang een waarde al te hoog is           | Unix-tijd in ms (UTC)                                                |
| Kamer-ID                                 | Weten **welke kamer** aandacht nodig heeft                      | Bv. `room1`, met een naam als "Kamer 1"                              |
| Alarmen                                  | Reden, gemeten waarde, status en tijdstippen                    | Bv. "Te warm: 27,4 °C"                                               |
| Wie een alarm bevestigde                 | Opvolging: zien dat iemand gereageerd heeft                     | Alleen **initialen of een rol** (bv. "VP"), nooit een volledige naam |

Alles wordt lokaal op de Raspberry Pi opgeslagen, in een SQLite-bestand. Er gaat niets naar de cloud. De app haalt de gegevens op via het lokale netwerk. De server logt alleen welke oproep er binnenkomt en van welk IP-adres, nooit meetwaarden.

### Een kamer-ID in plaats van persoonsgegevens

RestWell kent geen patiënten: geen naam, geen patiëntnummer, geen geboortedatum en geen diagnose. Alle data hangt aan een kamer-ID. Welke patiënt in welke kamer ligt, staat alleen in het eigen systeem van het ziekenhuis (het EPD), niet in RestWell.

Toch behandelen we de data als gevoelig. Wie weet wie er in een kamer ligt, kan metingen zoals beweging aan die persoon koppelen. Daarom gebruiken we nooit echte gegevens in code, tests of commits, en komt het databasebestand nooit in git.

### Wat we bewust niet meten

- **Geen camera.** Beeld identificeert mensen en raakt hun intimiteit, terwijl "beweging ja/nee" genoeg is voor ons doel.
- **Geen microfoon.** We meten geen geluid, ook geen geluidsniveau: er is geen geluidssensor, en geluid is uit het project geschrapt. Zouden we het later toevoegen, dan alleen als niveau in decibel, nooit als opname.
- **Geen vitale parameters** zoals hartslag of saturatie. Dat zou van RestWell een medisch hulpmiddel maken, met veel strengere regels (MDR), en het is niet nodig voor het binnenklimaat.
- **Geen locatie of identiteit van personeel.** Alleen initialen of een rol bij een bevestigd alarm.

### Hoe we het GDPR-bewust zouden aanpakken

Het prototype draait op een lokaal netwerk met verzonnen testdata. Voor gebruik in een echt ziekenhuis zouden we het volgende doen:

| Principe                | Nu in het prototype                                              | Bij echt gebruik                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Doelbinding**         | Data dient alleen om het binnenklimaat te bewaken                | Schriftelijk vastleggen, en de data nergens anders voor gebruiken (geen evaluatie van personeel, geen medisch onderzoek)                                                                                           |
| **Dataminimalisatie**   | Vier metingen, beweging alleen als ja/nee                        | Zo houden. Elke nieuwe sensor eerst verantwoorden                                                                                                                                                                  |
| **Bewaartermijn**       | Metingen blijven onbeperkt bewaard                               | Metingen na een vaste termijn (bv. 30 dagen) verwijderen of samenvatten tot gemiddelden                                                                                                                            |
| **Beveiliging**         | HTTP zonder versleuteling en zonder login, op een lokaal netwerk | TLS, een login voor de app, een afgeschermd zorgnetwerk en een versleutelde database                                                                                                                               |
| **Toegang**             | Iedereen op het netwerk kan de app gebruiken                     | Alleen zorgpersoneel van de afdeling, met een eigen account                                                                                                                                                        |
| **Transparantie**       | –                                                                | Patiënten informeren met een folder of een sticker in de kamer, en uitleggen wat er gemeten wordt                                                                                                                  |
| **Rechtsgrond en DPIA** | –                                                                | Samen met de functionaris voor gegevensbescherming (DPO) van het ziekenhuis de rechtsgrond bepalen en een gegevensbeschermingseffectbeoordeling (DPIA) uitvoeren, omdat het om monitoring in een zorgomgeving gaat |

## Werkafspraken

Zie [AGENTS.md](AGENTS.md) voor de structuur, de open beslissingen en de regels voor codekwaliteit.
