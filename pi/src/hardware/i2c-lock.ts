// De GrovePi en de OLED delen één I²C-bus. Een GrovePi-commando is "schrijven, wachten, lezen":
// als er tussendoor iets anders op de bus gebeurt, kan het antwoord verkeerd zijn.
// Daarom loopt alle bustoegang één voor één via deze lock.
export type I2cLock = <T>(task: () => Promise<T>) => Promise<T>;

export function createI2cLock(): I2cLock {
  let queue: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task);
    // Een mislukte taak mag de volgende niet tegenhouden. De fout gaat wel naar de aanroeper.
    queue = run.catch(() => undefined);
    return run;
  };
}
