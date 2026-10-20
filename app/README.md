# app

The Lynx app by RestWell, written in TypeScript using [Lynx](https://lynxjs.org) and ReactLynx.

Communicates with the Raspberry Pi via gRPC. The client code is generated from the `.proto` files in [`/proto`](../proto).

> ⚠️ This is a prototype for a school project and is not a medical device.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- Lynx Explorer to view the app (see below)

## Getting Started

Run all commands in this directory (`/app`).

```bash
npm install
npm run dev
```

The terminal will display a QR code and a bundle URL.

## Viewing the App

### On your iPhone

1. Install **Lynx Explorer** from the App Store (community version, not officially from the Lynx team).
2. Connect your iPhone and your computer to the same Wi-Fi network. If the school Wi-Fi isn’t working, use your iPhone’s hotspot.
3. Scan the QR code from the terminal, or paste the bundle URL into **Enter Card URL**.

### In the iOS Simulator (Mac)

1. Install Xcode.
2. Download LynxExplorer for your chip (`arm64` or `x86_64`) from the [Lynx Quick Start](https://lynxjs.org/guide/start/quick-start) and unzip it.
3. Open the Simulator (Xcode → Open Developer Tool → Simulator) and drag `LynxExplorer.app` into it.
4. Paste the bundle URL into Lynx Explorer.

## Screens

| Folder | What |
| --- | --- |
| `src/App.tsx` | Switches between the two screens; shows the prototype banner on every screen |
| `src/screens/` | `RoomListScreen` (all rooms) and `RoomDetailScreen` (readings and alarms of one room) |
| `src/components/` | Small building blocks: `RoomRow`, `MeasurementRow`, `AlarmCard`, `PrototypeBanner` |
| `src/format/` | Turns values from the contract into text (`21,5 °C`, `1 alarm`, ...), with tests |

**Tap handlers that call the Pi must start with `'background only';`.** ReactLynx also runs component code on the main thread, where `fetch` does not exist; the directive removes the handler there. Network code in `useEffect` needs nothing: effects only run on the background thread.

## Talking to the Pi (gRPC)

The app talks to the gRPC server on the Pi with [Connect](https://connectrpc.com/). Everything for that lives in `src/grpc/`:

| File | What |
| --- | --- |
| `client.ts` | `restWell`: the client to call RPCs from the contract, e.g. `await restWell.listRooms({})` |
| `useRoomLive.ts` | `useRoomLive(roomId)`: live readings and open alarms of a room |
| `roomState.ts` | How a message from the live stream updates what the app knows |
| `config.ts` | The server address (`PUBLIC_PI_URL`) |
| `useRooms.ts` | `useRooms()`: all rooms with their number of open alarms, fetched once |
| `useLatestReading.ts` | `useLatestReading(roomId)`: the latest reading, fetched once (until `WatchRoom` works in Lynx) |
| `acknowledgeAlarm.ts` | `acknowledgeAlarm(alarmId, initials)`: marks an alarm as seen |
| `errors.ts` | Readable error messages for on screen |
| `polyfills.ts` | `TextEncoder`/`TextDecoder` for Lynx. Must be the **first import** of every entry (`src/index.tsx`, `src/grpc-test/index.tsx`) |

In a screen you only need the hook:

```tsx
const { reading, alarms, status } = useRoomLive('room1');
return <text>{reading?.temperatureC ?? '–'} °C</text>;
```

The types (`Reading`, `Alarm`, ...) are generated from `/proto` into `src/generated/` (not in git). This happens automatically before `npm run dev`, `build` and `test`, or by hand with `npm run generate`.

### Server address

1. Copy `.env.example` to `.env.local`.
2. Set `PUBLIC_PI_URL` to the IP of the laptop running `npm run dev` in `/pi` (fake readings until the sensors are connected) (find it with `ipconfig`), or later the Pi. `localhost` does not work on a phone.
3. Restart `npm run dev`.

### Test page

`npm run dev` also builds a separate page, `grpc-test.lynx.bundle`, next to the app (`main.lynx.bundle`). Open its URL in Lynx Explorer. It shows:

- which web APIs Lynx has (Connect needs `fetch`, `Headers`, `AbortController`, `ReadableStream`, `BigInt`, `TextEncoder` and `TextDecoder`)
- whether a normal RPC works (`ListRooms`)
- whether live data comes in (`WatchRoom`): a new reading every second with `npm run dev` in `/pi`

Live data needs `enableFetchAPIStandardStreaming` (set in `lynx.config.ts`), which is experimental and requires Lynx 3.7 or newer. Always test on a real phone: the web preview uses the browser's `fetch`, where streaming always works.

## Scripts

| Command          | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Starts the dev server with live reload     |
| `npm run build`   | Builds the app for production |
| `npm run generate` | Generates the gRPC types from `/proto` into `src/generated/` |
| `npm test`        | Runs the tests (Rstest) |

Translated with DeepL.com (free version)