# hardware

**Verantwoordelijke:** hardware

Alles wat rechtstreeks met de fysieke onderdelen op de Pi praat:

- sensoren uitlezen (temperatuur, luchtvochtigheid, licht, geluid)
- het OLED-scherm aansturen

## Wat deze map aanbiedt

Eenvoudige functies die een meetwaarde teruggeven, met de eenheid in de naam. Bijvoorbeeld:

```ts
readTemperatureC(): Promise<number>
readHumidityPercent(): Promise<number>
showOnDisplay(lines: string[]): Promise<void>
```

Spreek de exacte functies af met de backend voor je begint, zodat die al kan verder werken.

## Afspraken

- Geen opslag en geen alarmlogica hier: deze map leest alleen uit en toont alleen.
- Voorzie voor elke sensor een **nep-versie** die verzonnen waarden teruggeeft. Zo kunnen de anderen werken en testen zonder Pi.
- Documenteer hier de **bedrading en pinout**: welke sensor op welke pin hangt.
