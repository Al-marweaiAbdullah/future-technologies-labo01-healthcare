# AI-verantwoording

Dit document legt uit welke AI-tools we voor RestWell gebruikten, waarvoor, met welke prompts, en wat we zelf aangepast of gecontroleerd hebben. Een korte versie staat ook in [reflectie.md](reflectie.md).

## 1. Gebruikte tools

| Tool                    | Model                              | Gebruikt door                           | Waarvoor                                                                                         |
| ----------------------- | ---------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Claude Code (Anthropic) | Claude Opus 5.5, Claude Sonnet 5.5 | Renz, Bram, Abdullah, Chadia (iedereen) | Code schrijven en aanpassen in `/pi`, `/app` en `/proto`, tests, documentatie en commitberichten |

We gebruikten geen andere AI-tools voor code of documentatie.

## 2. Waarvoor we AI gebruikten

| Onderdeel                        | Wat AI deed                                                                                                                         | Door                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `pi/src/hardware/`               | GrovePi-laag, sensoren, LED, buzzer en OLED-driver schrijven; nep-hardware voor ontwikkeling zonder Pi                              | Bram                              |
| `pi/src/db/` en `pi/src/alarms/` | SQLite-opslag, migraties, seed-script en de alarmlogica met drempels en tests                                                       | Abdullah                          |
| `proto/` en `pi/src/grpc/`       | Het contract en de ConnectRPC-server uitwerken (`WatchRoom`, `ListAlarms`, `ListThresholds`, `UpdateThreshold`, `AcknowledgeAlarm`) | Renz                              |
| `app/`                           | Lynx-schermen, gRPC-client, grafiek, drempelscherm en alarmpopup schrijven, met Rstest-tests                                        | Chadia                            |
| `docs/` en README's              | Eerste versies van README's, demo-script, privacy en reflectie                                                                      | iedereen, vooral Abdullah en Renz |

## 3. Prompts

Een selectie van de prompts die de resultaten het meest bepaald hebben, kort samengevat. Geen volledige log.

### Prompt 1: gRPC-client in Lynx

- **Wie:** Chadia
- **Prompt (samengevat):** "Laat de gRPC-client werken in Lynx op een iPhone" en "maak live data mogelijk zonder polling".
- **Resultaat:** een client op basis van `fetch` met server-streaming voor `WatchRoom`.
- **Wat we aanpasten:** Lynx heeft geen globale `fetch` en geen `TextDecoder`, en streaming is experimenteel. Dat bleek pas op een echte iPhone, en we lieten het daarna gericht oplossen. Bij wegvallende wifi bleef de stream stil hangen: daarvoor kwam een herverbinding na 10 s stilte.

### Prompt 2: sensoren en OLED

- **Wie:** Bram
- **Prompt (samengevat):** "Lees de Grove-sensoren uit via de GrovePi en toon ze op het OLED-scherm."
- **Resultaat:** een GrovePi-laag met sensoren, LED, buzzer en OLED.
- **Wat we aanpasten:** op de echte Pi bleek dat de LED omgekeerd werkt, het OLED gespiegeld stond, GrovePi-commando's elkaar overschreven en de lichtsensor geen lux geeft. De lichtdrempel ging naar 900.

### Prompt 3: drempels en alarmlogica

- **Wie:** Abdullah
- **Prompt (samengevat):** "Zoek bronnen voor de drempels" en "voeg de alarmlogica toe".
- **Resultaat:** configureerbare drempels en pure alarmlogica met tests.
- **Wat we aanpasten:** we kozen de drempels zelf en motiveerden ze met bronnen (WHO, EPA).

### Prompt 4: contractwijzigingen

- **Wie:** Renz
- **Prompt (samengevat):** "Werk issue X uit volgens AGENTS.md", met de issue als opdracht.
- **Resultaat:** nieuwe RPC's en velden in `/proto`, met de Pi- en app-code in dezelfde wijziging.
- **Wat we aanpasten:** elke contractwijziging werd eerst door Renz goedgekeurd, zoals AGENTS.md vraagt.

## 4. Wat we zelf aangepast of gecontroleerd hebben

AI-output is niet blind overgenomen. Per teamlid:

| Teamlid  | Deel       | Zelf beslist, aangepast of gecontroleerd                                                                                                                                          |
| -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renz     | proto/gRPC | Koos Connect en server-streaming en wees polling af. Liet de oude naam KamerWacht vervangen door RestWell. Keurde elke contractwijziging goed en testte de stream met `buf curl`. |
| Bram     | hardware   | Testte alles op de echte Pi en vond zo de omgekeerde LED, de overschrijvende GrovePi-commando's en het ontbreken van lux. Zette RestWell als systemd-service op de Pi.            |
| Abdullah | backend    | Legde de drempels vast en motiveerde ze met bronnen. Bepaalde de opslag en de alarmlogica, en schreef de privacy- en ethiekdocumentatie.                                          |
| Chadia   | Lynx-app   | Testte de app op een echte iPhone in Lynx Explorer, waar de gRPC-client faalde op punten die de tests niet toonden (`fetch`, `TextDecoder`, de main thread).                      |

Controle die we deden:

- Elke wijziging kwam via een pull request die door minstens één ander teamlid bekeken werd (zie [AGENTS.md](../AGENTS.md)).
- Unit tests met `node:test` (Pi) en Rstest (app), en de linter.
- Hardware-gedrag op de echte Raspberry Pi met de echte sensoren.
- De app op een iPhone in Lynx Explorer.

## 5. Afspraken die we aan AI-agents meegaven

De regels in [AGENTS.md](../AGENTS.md) zijn ook de instructies voor Claude Code: binnen de vraag blijven, geen beslissingen uit "Open beslissingen" nemen, niet committen of mergen zonder akkoord, geen nieuwe dependencies zonder reden en afwijkingen van het contract melden in plaats van ze zelf door te voeren.

## 6. Gezondheidsgegevens en privacy

- Alle testdata is verzonnen en komt uit een seed-script. Er is geen echte persoons- of medische data in prompts of code gebruikt.
- Er zijn geen secrets, `.env`-bestanden of databasebestanden in de repository gecommit.

## 7. Beperkingen en eerlijkheid

- Het grootste deel van de code en de documentatie is door AI geschreven. Wij beslisten wat er gebouwd werd, lazen elke wijziging na en testten ze.
- Fouten die alleen op de echte hardware of het echte toestel opdoken, vonden we zelf.
- RestWell is een prototype en geen medisch hulpmiddel.
