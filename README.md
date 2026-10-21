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

Zie [`docs/privacy.md`](docs/privacy.md): welke data we verzamelen en waarom, waarom we een kamer-ID gebruiken in plaats van persoonsgegevens, wat we bewust niet meten (geen camera of microfoon) en hoe we het GDPR-bewust zouden aanpakken.

## Reflectie en AI-verantwoording

Zie [`docs/reflectie.md`](docs/reflectie.md): wat werkte, wat niet, de volgende stap, en welke AI-tools we gebruikten en wat we zelf controleerden.

## Werkafspraken

Zie [AGENTS.md](AGENTS.md) voor de structuur, de open beslissingen en de regels voor codekwaliteit.
