# AGENTS.md

Richtlijnen voor iedereen die aan deze repository werkt, mensen én AI-agents (Claude Code, Codex, Copilot, ...).
Lees dit voor je code schrijft.

## Project

**KamerWacht** (Future Technologies – Labo 01 Healthcare). Een verpleegkundige kan niet elke kamer permanent controleren, terwijl warmte, droge lucht, licht en lawaai het comfort, de slaap en het herstel van een patiënt beïnvloeden. KamerWacht bewaakt dat automatisch en alarmeert alleen als er iets afwijkt.

Technisch: een Raspberry Pi leest sensoren uit, toont gegevens op een OLED-scherm en stelt ze via gRPC beschikbaar aan een mobiele app (Lynx, TypeScript).

Alarmeren alleen bij afwijkingen is een kernidee: vermijd valse alarmen en alarmmoeheid. Drempelwaarden en logica om alarmen te bepalen moeten duidelijk, configureerbaar en getest zijn.

Team: 4 personen, looptijd: 1 week. Houd het dus simpel: liever iets eenvoudigs dat werkt dan iets slims dat half af is.

## Structuur

Dit is een monorepo, opgesplitst per onderdeel:

| Map | Inhoud | Taal |
| --- | --- | --- |
| `/pi` | Alles wat op de Raspberry Pi draait: sensoren, backend, OLED, gRPC-server | nog te bepalen (zie hieronder) |
| `/app` | De Lynx-app | TypeScript |
| `/proto` | Het gRPC-contract (`.proto`-bestanden) | Protocol Buffers |

Regels voor de structuur:

- Elk onderdeel heeft zijn eigen dependencies, build en tooling **in zijn eigen map**. Zet geen `package.json`, `requirements.txt` of iets gelijkaardigs in de root.
- `/proto` is de enige bron van waarheid voor de communicatie tussen Pi en app. Kopieer `.proto`-bestanden nooit naar `/pi` of `/app`: genereer code vanuit `/proto`.
- Gegenereerde code staat in een duidelijk benoemde map (bv. `generated/`) en wordt nooit met de hand aangepast.

## Open beslissingen

Deze keuzes zijn **nog niet gemaakt**. Ga er niet van uit en kies ze niet op eigen houtje; vraag het eerst aan het team.

- **Taal en framework van de backend op de Pi** (Python, Node/TypeScript, Go, ...). Zodra dit vastligt, vul je de sectie "Codekwaliteit per onderdeel" hieronder aan.
- Hoe de Pi-code opgedeeld wordt (één proces of meerdere services).
- Hoe de code uit `/proto` gegenereerd wordt (tool, script, waar de output komt).

Is een beslissing genomen? Pas dit bestand aan en verplaats het punt naar de juiste sectie.

## Werkafspraken

### Git

- `main` moet altijd werken. Werk op een eigen branch: `feature/<korte-naam>`, `fix/<korte-naam>` of `docs/<korte-naam>`.
- Merge naar `main` via een pull request die door minstens één teamlid bekeken is.
- Kleine, gerichte commits. Commitbericht in de gebiedende wijs, bv. `Voeg hartslagsensor toe`, met in de body het waarom als dat niet vanzelf spreekt.
- Commit nooit secrets, `.env`-bestanden, build-output, `node_modules` of virtuele omgevingen.

### Wijzigingen aan het contract (`/proto`)

Een wijziging in `/proto` raakt zowel de Pi als de app. Daarom:

- Meld het aan het team voor je het contract aanpast.
- Pas in dezelfde pull request de code aan beide kanten aan, of maak duidelijk wie dat doet.
- Hergebruik nooit een veldnummer en verander nooit het type of nummer van een bestaand veld. Een veld schrappen doe je met `reserved`.
- Naamgeving volgens de [Protobuf-stijlgids](https://protobuf.dev/programming-guides/style/): `PascalCase` voor messages, services en RPC's, `snake_case` voor velden, `UPPER_SNAKE_CASE` voor enum-waarden (met prefix, en `..._UNSPECIFIED = 0` als eerste waarde).
- Zet een korte comment bij elke service, RPC en elk veld waarvan de betekenis of eenheid niet evident is (bv. `// hartslag in slagen per minuut`).

## Codekwaliteit

### Algemeen

- **Leesbaar boven slim.** Duidelijke namen, korte functies die één ding doen, geen magische getallen (gebruik benoemde constanten, met eenheid in de naam waar nuttig: `SAMPLE_INTERVAL_MS`).
- **Eén taal voor code:** namen en code in het Engels. Comments en documentatie mogen in het Nederlands.
- **Comments verklaren het waarom**, niet het wat. Verwijder uitgecommentarieerde code in plaats van ze te laten staan.
- **Geen dode code of TODO's zonder eigenaar.** Een TODO krijgt een naam of issue erbij: `TODO(renz): ...`.
- **Foutafhandeling:** vang fouten op waar je er iets zinvols mee kan doen, en geef duidelijke foutmeldingen. Slik fouten nooit stil in. Een sensor die uitvalt mag de rest van het systeem niet laten crashen.
- **Configuratie** (poorten, pinnummers, IP-adressen, intervallen) staat in een config-bestand of omgevingsvariabelen, niet verspreid door de code.
- **Dependencies:** voeg enkel een library toe als ze echt iets oplost, en vermeld waarom in de pull request. Pin versies.
- **Formatteren en linten** gebeurt automatisch met de tooling van het onderdeel. Code die de linter niet haalt, wordt niet gemerged.
- **Testen:** schrijf tests voor logica die je kan testen zonder hardware (berekeningen, omzettingen, validatie). Houd hardwaretoegang achter een dunne laag, zodat je die kan vervangen door een nep-sensor bij het testen en ontwikkelen zonder Pi.

### Gezondheidsgegevens

Dit is een healthcare-project. Behandel meetwaarden als gevoelige gegevens:

- Gebruik nooit echte persoonsgegevens of medische gegevens in de code, tests, voorbeelden of commits. Gebruik verzonnen testdata.
- Log geen meetwaarden die aan een persoon te koppelen zijn, behalve tijdens lokaal debuggen, en haal dat weg voor je commit.
- Toon in de app duidelijk dat het om een prototype gaat en niet om een medisch hulpmiddel.

### Codekwaliteit per onderdeel

**`/app` (TypeScript, Lynx)**

- `strict` aan in `tsconfig.json`. Geen `any`; gebruik `unknown` en vernauw het type.
- ESLint en Prettier voor linten en formatteren.
- Gebruik de types die uit `/proto` gegenereerd worden, definieer ze niet opnieuw met de hand.
- Componenten klein houden; logica (data ophalen, omzetten) apart van de weergave.

**`/pi`**

- Nog in te vullen zodra de taal gekozen is: linter, formatter, testframework, manier om de code te starten.
- Houd sensoren, OLED en gRPC-server gescheiden in eigen modules, zodat ze apart te testen en te vervangen zijn.

**`/proto`**

- Zie "Wijzigingen aan het contract" hierboven.

## Afspraken voor AI-agents

- Lees dit bestand en de README van het onderdeel waarin je werkt voor je begint.
- Neem geen beslissingen uit "Open beslissingen" zonder ze eerst aan de gebruiker voor te leggen.
- Blijf binnen de vraag: geen refactors, extra features of nieuwe dependencies die niet gevraagd zijn.
- Commit, push en merge nooit zonder uitdrukkelijk akkoord van de gebruiker.
- Pas documentatie (README, dit bestand) aan als je iets verandert aan de structuur, de tooling of een afspraak.
- Weet je iets niet zeker (hardware, pinout, contract)? Vraag het in plaats van te gokken.
