import { describe, expect, test } from '@rstest/core';

import {
  StreamTimeoutError,
  readWithTimeout,
} from '../grpc/readWithTimeout.js';

const SHORT_TIMEOUT_MS = 20;

describe('readWithTimeout', () => {
  test('geeft het stuk door als het op tijd komt', async () => {
    const reader = new ReadableStream<number>({
      start(controller) {
        controller.enqueue(42);
      },
    }).getReader();

    const result = await readWithTimeout(reader, SHORT_TIMEOUT_MS);

    expect(result).toEqual({ done: false, value: 42 });
  });

  test('gooit StreamTimeoutError als er niets komt', async () => {
    const silentReader = new ReadableStream<number>().getReader();

    await expect(
      readWithTimeout(silentReader, SHORT_TIMEOUT_MS),
    ).rejects.toBeInstanceOf(StreamTimeoutError);
  });

  test('de foutmelding noemt het aantal seconden', () => {
    expect(new StreamTimeoutError(10_000).message).toBe(
      '10 s geen bericht van de Pi',
    );
  });
});
