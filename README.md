# Future Technologies – Labo 01 Healthcare

Dit project is een **monorepo**: het hele project zit in één repository, opgesplitst per onderdeel.

## Structuur

| Map | Inhoud |
| --- | --- |
| [`/pi`](pi) | Python-code die op de Raspberry Pi draait (sensoren, backend, OLED, gRPC-server) |
| [`/app`](app) | De Lynx-app (TypeScript), met een andere taal en andere tools |
| [`/proto`](proto) | Het `.proto`-contract. Apart omdat zowel de Pi als de app er code uit genereren |

`/proto` is de enige bron van waarheid voor de communicatie tussen Pi en app: verandert het contract, dan zien beide kanten dat meteen.

## Waarom zo?

- **Niet alles door elkaar:** Python en TypeScript hebben elk hun eigen dependencies en build. In één map wordt dat rommelig.
- **Geen aparte repos per onderdeel:** dat kan, maar dan moet het `.proto`-bestand gekopieerd en gesynchroniseerd blijven. Voor 4 mensen en één week is dat onnodig werk.

Het is niet de enige juiste manier, maar wel de meest gebruikte en simpelste voor zo'n project.
