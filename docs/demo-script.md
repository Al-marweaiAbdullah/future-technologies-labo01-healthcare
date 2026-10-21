# Demo RestWell: script (± 2 min)

Script voor de verplichte demo (#34): hardware en app samen in beeld, met minstens één melding.

## Goed om te weten

- **Ademen op de DHT22** laat de vochtigheid op een paar seconden stijgen. Een vochtigheidsalarm gaat meteen af, zonder wachttijd. Een hand op de sensor of het licht (60 s boven de grens) duurt langer.
- **Het lichtalarm geldt alleen 's nachts** (22 tot 7, klok van de Pi). Overdag gaat het dus niet af: gebruik vochtigheid. Wil je toch licht tonen, zet het venster dan tijdelijk rond het huidige uur, en daarna terug (`active_from_hour = 22, active_to_hour = 7`):

  ```bash
  sqlite3 pi/data/restwell.db "UPDATE thresholds SET active_from_hour = 8, active_to_hour = 20 WHERE sensor = 'light';"
  ```
- **De buzzer gaat pas na 60 s af** als niemand het alarm bevestigt (`buzzer_after_sec`).
- **Na "Gezien"** stopt de buzzer, maar de LED blijft aan en het OLED-scherm toont het alarm nog. De kamer wordt oranje. Pas als de waarde weer normaal is, wordt alles groen en toont het OLED-scherm "Alles OK".

## Voorbereiding (niet filmen)

1. Controleer dat de service draait: `systemctl is-active restwell` (zie [`pi/README.md`](../pi/README.md)).
2. Zet de telefoon op hetzelfde wifi als de Pi, zet `PUBLIC_PI_URL` in `app/.env.local` op het IP van de Pi, start `npm run dev` in `/app` en open de app in Lynx Explorer.
3. Ligt de vochtigheid in de kamer boven de grens? Zet dan in de app via **Drempels aanpassen ›** de maximale vochtigheid op **70 %** en druk op **Opslaan**. Het oude alarm lost dan op. Druk daarna op **Gezien** met initialen, zodat het uit de lijst verdwijnt.
4. Controleer de beginsituatie: kamer groen, OLED-scherm toont "Alles OK", LED uit, de app toont **Live**.
5. Opstelling: de Pi met het OLED-scherm, de LED en de DHT22 op de voorgrond, de telefoon ernaast in beeld. Geen gezichten in beeld, geen wifi-naam en geen echte namen.

## Script

| Tijd | Beeld | Wat je zegt (voice-over) |
| --- | --- | --- |
| 0:00–0:15 | Totaalbeeld: Pi, sensoren, telefoon | "Een verpleegkundige kan niet elke kamer controleren. RestWell meet temperatuur, vochtigheid, licht en beweging, en alarmeert alleen als er iets afwijkt." |
| 0:15–0:30 | De app: kamerlijst, dan het detailscherm met live waarden | "De Pi stuurt elke 2 seconden een meting naar de app. De kamer is groen, het OLED-scherm toont 'Alles OK'." |
| 0:30–0:45 | Close-up: iemand ademt een paar keer op de DHT22 | "We simuleren een te vochtige kamer." |
| 0:45–1:00 | OLED-scherm "Te vochtig: …%", LED aan, in de app een rode melding | "De vochtigheid gaat boven de grens. Het OLED-scherm toont de reden, de LED gaat aan en de melding staat meteen in de app." |
| ✂️ knip | (± 45 s wachten) | |
| 1:00–1:15 | De buzzer klinkt | "Bevestigt niemand het alarm binnen een minuut, dan gaat de buzzer af." |
| 1:15–1:35 | In de app: initialen invullen en op **Gezien** drukken. De buzzer stopt, de kamer wordt oranje | "De verpleegkundige bevestigt het alarm in de app. De buzzer stopt meteen." |
| ✂️ knip | (wachten tot de vochtigheid weer onder de grens is) | |
| 1:35–1:50 | OLED-scherm "Alles OK", LED uit, kamer groen, grafiek bij **Verloop** | "Is de waarde weer normaal, dan verdwijnt het alarm vanzelf. In de grafiek zie je de piek terug." |
| 1:50–2:00 | De banner "Prototype – geen medisch hulpmiddel" | "Drempels zijn aanpasbaar in de app. RestWell is een prototype, geen medisch hulpmiddel." |

## Tips

- Doe eerst een proefrun. Dan weet je hoe lang het duurt voor de vochtigheid weer onder de grens zakt.
- Komt de buzzer niet na 60 s, controleer dan of het alarm nog **actief** is, dus nog niet bevestigd.
- Na de opname: zet een aangepaste drempel terug, of motiveer de nieuwe waarde met een bron in de README.
- Zet de link naar de video in de README. Commit geen groot videobestand.
