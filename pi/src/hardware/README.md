# hardware

**Verantwoordelijke:** hardware

Alles wat rechtstreeks met de fysieke onderdelen op de Pi praat:

- sensoren uitlezen (temperatuur, luchtvochtigheid, licht, beweging)
- de LED, de buzzer en het OLED-scherm aansturen

## Wat deze map aanbiedt

Importeer alleen uit `hardware/index.ts`.

| Functie / type                      | Wat het doet                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `openHardware(): Promise<Hardware>` | Opent de echte hardware, of de nep-versie als `RESTWELL_FAKE_HARDWARE=1`                           |
| `readAllSensors(hardware)`          | Leest alle sensoren één keer uit. Een sensor die faalt, wordt `null` (en de fout wordt gelogd)     |
| `createFakeHardware()`              | Nep-hardware met verzonnen waarden. `state` toont wat LED, buzzer en OLED zouden doen (voor tests) |
| `DISPLAY_MAX_LINES`                 | Aantal regels op de OLED (12). Langere tekst wordt afgeknipt                                       |
| `DISPLAY_MAX_CHARS_PER_LINE`        | Aantal tekens per regel (16). Letters met accent worden gewone letters (é → e)                     |
| `LIGHT_RAW_MAX`                     | Hoogste waarde van de lichtsensor (1023)                                                           |

Een `Hardware`-object heeft:

```ts
readTemperatureHumidity(): Promise<{ temperatureC: number; humidityPercent: number }>
readLightRaw(): Promise<number>        // 0 (donker) tot 1023 (fel licht)
readMotionDetected(): Promise<boolean>
setLed(on: boolean): Promise<void>
setBuzzer(on: boolean): Promise<void>
showOnDisplay(lines: string[]): Promise<void>
close(): Promise<void>                 // LED en buzzer uit, scherm leeg, bus dicht
```

Temperatuur en luchtvochtigheid zitten samen in één functie, omdat de DHT22 ze altijd samen meet.

De losse functies gooien een fout als een sensor niet antwoordt of een onmogelijke waarde geeft (bv. NaN of 120 % vochtigheid). Gebruik `readAllSensors` als je wil dat één kapotte sensor de rest niet tegenhoudt.

### Uitproberen

```bash
npm run hardware:check                            # echte sensoren, elke 2 s naar terminal en OLED
RESTWELL_FAKE_HARDWARE=1 npm run hardware:check   # zonder Pi, met nepwaarden
```

## Bedrading

Alles hangt aan een **GrovePi** (Dexter Industries) op de Raspberry Pi. De GrovePi heeft een eigen microcontroller op I²C-adres `0x04`: de Pi leest de Grove-poorten uit door I²C-commando's naar die chip te sturen, niet rechtstreeks via zijn eigen GPIO-pinnen.

| GrovePi-poort | Onderdeel                                         | Uitgelezen als      |
| ------------- | ------------------------------------------------- | ------------------- |
| D2            | Grove temperatuur & luchtvochtigheid (DHT22, wit) | °C en %, 1 decimaal |
| D3            | Grove LED (variable color)                        | aan / uit           |
| D4            | Grove bewegingssensor (PIR)                       | beweging ja / nee   |
| D7            | Grove buzzer                                      | aan / uit           |
| A0            | Grove lichtsensor (LDR)                           | ruwe waarde 0–1023  |
| I2C-1         | Grove OLED Display 96×96 v2.1 (SSD1327), `0x3C`   | 12 regels tekst     |

Er is geen geluidssensor. `sound_raw` in de database blijft dus leeg (`null`).

Poortnummers en I²C-adressen staan in `src/config.ts`.

## Voorbereiding op de Pi

1. I²C aanzetten: `sudo raspi-config nonint do_i2c 0` (eenmalig, geen herstart nodig).
2. De gebruiker moet in de groep `i2c` zitten (standaard voor `pi`).
3. Controleren: `/dev/i2c-1` bestaat, en een scan van bus 1 toont `0x04` (GrovePi) en `0x3c` (OLED). Met `sudo apt install i2c-tools` krijg je daarvoor `i2cdetect -y 1`.

## Libraries

- [`i2c-bus`](https://www.npmjs.com/package/i2c-bus): toegang tot de I²C-bus. Het GrovePi-protocol zit in `grovepi-protocol.ts` (getest) en `grovepi.ts`. De bestaande npm-pakketten voor de GrovePi worden niet meer onderhouden.
- [`oled-font-5x7`](https://www.npmjs.com/package/oled-font-5x7): het lettertype voor de OLED.

Voor de OLED zelf gebruiken we geen library: de bekende Node-libraries (bv. `oled-i2c-bus`) ondersteunen alleen SSD1306 en SH1106, en dit scherm heeft een SSD1327. De kleine driver zit in `oled.ts` (I²C) en `oled-frame.ts` (tekst omzetten naar pixels, getest). De instellingen komen uit [Seeeds eigen library](https://github.com/Seeed-Studio/OLED_Display_96X96). Het beeld wordt in software gespiegeld en omgedraaid (`FLIP_HORIZONTAL`, `FLIP_VERTICAL` in `oled-frame.ts`), anders staat de tekst in spiegelschrift en op zijn kop. Een volledig scherm versturen duurt ±0,5 s.

De GrovePi en de OLED delen één bus. Alle bustoegang loopt daarom één voor één via `i2c-lock.ts`, zodat een GrovePi-antwoord niet door een OLED-update verstoord wordt.

## Afspraken

- Geen opslag en geen alarmlogica hier: deze map leest alleen uit en toont alleen.
- Elke functie heeft een nep-versie in `fake.ts`. Zo kunnen de anderen werken en testen zonder Pi.
- De DHT22 geeft hoogstens om de 2 seconden een nieuwe meting. Lees niet sneller uit.
