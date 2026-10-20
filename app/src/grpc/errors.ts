// Leesbare foutmeldingen voor op het scherm.
import { Code, ConnectError } from '@connectrpc/connect';

export function errorMessage(error: unknown): string {
  if (error instanceof ConnectError) {
    if (error.code === Code.Unimplemented)
      return 'Nog niet beschikbaar op de Pi';
    if (error.code === Code.Unavailable) return 'De Pi is niet bereikbaar';
    return error.rawMessage;
  }
  return error instanceof Error ? error.message : String(error);
}
