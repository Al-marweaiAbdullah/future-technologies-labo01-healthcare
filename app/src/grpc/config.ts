// Adres van de gRPC-server: de Pi, of je laptop met `npm run dev:fake` in /pi.
// Instellen in app/.env.local (zie .env.example). `localhost` werkt niet op een telefoon.
const DEFAULT_PI_URL = 'http://localhost:8080';

export const PI_URL: string =
  (import.meta.env.PUBLIC_PI_URL as string | undefined) ?? DEFAULT_PI_URL;
