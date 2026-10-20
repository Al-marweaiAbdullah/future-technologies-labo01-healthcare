export type TemperatureHumidity = {
  temperatureC: number;
  humidityPercent: number;
};

// Eén ronde metingen. `null` betekent: deze sensor kon niet uitgelezen worden.
export type SensorReadings = {
  temperatureC: number | null;
  humidityPercent: number | null;
  lightRaw: number | null; // 0 (donker) tot 1023 (fel licht)
  motionDetected: boolean | null;
};

// Alles wat hardware/ kan. De echte en de nep-versie bieden precies dit aan.
export type Hardware = {
  // De DHT22 meet temperatuur en luchtvochtigheid in één keer.
  readTemperatureHumidity(): Promise<TemperatureHumidity>;
  readLightRaw(): Promise<number>;
  readMotionDetected(): Promise<boolean>;
  setLed(on: boolean): Promise<void>;
  setBuzzer(on: boolean): Promise<void>;
  showOnDisplay(lines: string[]): Promise<void>;
  close(): Promise<void>;
};
