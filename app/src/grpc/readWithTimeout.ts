// Valt de wifi stil weg, dan komt er geen fout: read() blijft gewoon wachten. Een time-out
// maakt van die stilte een fout, zodat useRoomLive opnieuw verbindt.

export class StreamTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`${timeoutMs / 1000} s geen bericht van de Pi`);
    this.name = 'StreamTimeoutError';
  }
}

/** Zoals `reader.read()`, maar gooit StreamTimeoutError als er binnen `timeoutMs` niets komt. */
export async function readWithTimeout<T>(
  reader: ReadableStreamDefaultReader<T>,
  timeoutMs: number,
): Promise<ReadableStreamReadResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new StreamTimeoutError(timeoutMs)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([reader.read(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
