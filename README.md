# Future Technologies – Labo 01 Healthcare

Dit project is een **monorepo**: het hele project zit in één repository, opgesplitst per onderdeel. Een verpleegkundige kan niet elke kamer permanent controleren. Toch beïnvloeden warmte, droge lucht, licht en lawaai het comfort, de slaap en het herstel van een patiënt. KamerWacht bewaakt dat automatisch en alarmeert alleen als er iets afwijkt.

## Structuur

| Map               | Inhoud                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| [`/pi`](pi)       | Code die op de Raspberry Pi draait (sensoren, backend, OLED, gRPC-server). Taal nog te bepalen  |
| [`/app`](app)     | De Lynx-app (TypeScript), met een andere taal en andere tools                                   |
| [`/proto`](proto) | Het `.proto`-contract. Apart omdat zowel de Pi als de app er code uit genereren                 |

`/proto` is de enige bron van waarheid voor de communicatie tussen Pi en app: verandert het contract, dan zien beide kanten dat meteen.

## Werkafspraken

Zie [AGENTS.md](AGENTS.md) voor de structuur, de open beslissingen en de regels voor codekwaliteit.
