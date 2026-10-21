# Reflectie en AI-verantwoording

## Reflectie

**Wat werkte.** Eén contract in `/proto` voor Pi en app, en een vaste taakverdeling per map. Eenmaal de live data (`WatchRoom`) werkte, ging de rest vlot: de metingen van de hardware live in de app tonen en de backend koppelen was eenvoudig. Dankzij de nep-hardware konden we zonder Pi verder werken.

**Wat niet.** De link tussen gRPC en Lynx kostte de meeste tijd. Lynx heeft geen globale `fetch` en geen `TextDecoder`, streaming is er experimenteel, en bij wegvallende wifi bleef de stream stil hangen zonder fout.

**Troubleshooting-checklist.** De LED werkt omgekeerd (brandt als de pin laag is), het OLED-scherm stond gespiegeld en op zijn kop (nu in software omgedraaid) en de DHT22 lezen we niet sneller uit dan om de 2 s. Daarnaast overschreven GrovePi-commando's elkaar als ze te snel na elkaar kwamen.

**Volgende stap.** Meerdere kamers samen testen, het lichtalarm testen met echte nachtlichtwaarden in plaats van de demowaarde van 60 s, en beveiliging (TLS, aanmelden) voor RestWell buiten een prototype gebruikt wordt.

## AI-verantwoording

**Tools.** Claude Code (Claude Opus 5.5) voor code, tests, documentatie en commitberichten. 32 van de 38 commits hebben Claude als co-auteur. [AGENTS.md](../AGENTS.md) legt de regels voor AI vast: niets aan het contract veranderen zonder akkoord, nooit committen of mergen zonder akkoord, geen nieuwe dependencies zonder reden.

**Belangrijkste prompts** (kort samengevat):

- "Werk issue X uit volgens AGENTS.md", met de issue als opdracht
- "Laat de gRPC-client werken in Lynx op een iPhone" en "maak live data mogelijk zonder polling"
- "Lees de Grove-sensoren uit via de GrovePi en toon ze op het OLED-scherm"
- "Zoek bronnen voor de drempels" en "voeg de alarmlogica toe"

**Wat we zelf aanpasten of corrigeerden:**

| Teamlid | Deel | Zelf beslist, aangepast of gecontroleerd |
| --- | --- | --- |
| Renz | proto/gRPC | Koos Connect en server-streaming en wees polling (ook long polling) af. Liet de oude naam KamerWacht overal vervangen door RestWell. Keurde elke contractwijziging zelf goed en koos de betekenis van nieuwe RPC's (bv. welke alarmen `ListAlarms` geeft). Testte de stream met `buf curl`. |
| Bram | hardware | Testte alles op de echte Pi. Vond zo zelf dat de LED omgekeerd werkt, dat GrovePi-commando's elkaar overschrijven en dat de lichtsensor geen lux geeft (gewoon kamerlicht ±765, drempel naar 900). |
| Abdullah | backend | Legde de drempels vast en motiveerde ze met bronnen (WHO, EPA). Bepaalde de opslag en de alarmlogica. |
| Chadia | Lynx-app | Testte de app op een echte iPhone in Lynx Explorer. Daar faalde de gRPC-client op punten die de tests niet toonden (`fetch`, `TextDecoder`, de main thread). |

**Eerlijk.** Het grootste deel van de code en de documentatie is door AI geschreven. Wij beslisten wat er gebouwd werd, lazen elke wijziging na in een pull request en testten ze: met de unit tests (`node:test` en Rstest), op de Pi met de echte sensoren en in de app op een iPhone. Fouten die alleen op de echte hardware of het echte toestel opdoken, vonden we zelf en lieten we daarna gericht oplossen.
