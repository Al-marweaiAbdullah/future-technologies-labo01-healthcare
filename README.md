# Future Technologies – Labo 01 Healthcare

Dit project is een **monorepo**: het hele project zit in één repository, opgesplitst per onderdeel. Een verpleegkundige kan niet elke kamer permanent controleren. Toch beïnvloeden warmte, droge lucht, licht en lawaai het comfort, de slaap en het herstel van een patiënt. KamerWacht bewaakt dat automatisch en alarmeert alleen als er iets afwijkt.

## Stack

| Onderdeel    | Technologie                                           |
| ------------ | ----------------------------------------------------- |
| Hardware     | Raspberry Pi met sensoren en een OLED-scherm          |
| Backend      | TypeScript op Node.js                                 |
| Database     | SQLite (op de Pi)                                     |
| Frontend     | Lynx-app in TypeScript                                |
| Communicatie | gRPC, met het contract in Protocol Buffers (`.proto`) |

Nog niet gekozen: de Node.js-versie, de libraries voor SQLite, gRPC, de sensoren en het OLED-scherm, en het testframework. Zie [AGENTS.md](AGENTS.md#open-beslissingen).

## Structuur

| Map               | Rol      | Inhoud                                                                                                 |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| [`/pi`](pi)       | backend  | Code die op de Raspberry Pi draait (sensoren, backend, OLED, gRPC-server): TypeScript, Node.js, SQLite |
| [`/app`](app)     | frontend | De Lynx-app (TypeScript)                                                                               |
| [`/proto`](proto) | contract | Het `.proto`-contract. Apart omdat zowel de Pi als de app er code uit genereren                        |

`/proto` is de enige bron van waarheid voor de communicatie tussen Pi en app: verandert het contract, dan zien beide kanten dat meteen.

## Werkafspraken

Zie [AGENTS.md](AGENTS.md) voor de structuur, de open beslissingen en de regels voor codekwaliteit.
