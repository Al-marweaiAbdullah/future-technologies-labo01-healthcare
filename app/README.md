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
| `src/App.tsx` | Switches between the screens; shows the prototype banner on every screen |
| `src/screens/` | `RoomListScreen` (all rooms), `RoomDetailScreen` (readings, chart and alarms of one room) and `ThresholdScreen` (one tab per sensor to adjust its threshold, and for light the night rest, e.g. 22 to 7, when the light alarm applies; via `UpdateThreshold`) |
| `src/components/` | Small building blocks: `RoomRow`, `MeasurementRow`, `AlarmCard` (also counts down to the buzzer in the room), `AlarmPopup` (red notice on the room screen when an alarm goes off while it is open, with the buzzer countdown; disappears after 10 s or on tap, the alarm stays under Alarmen), `PrototypeBanner`, `Chip` (choice button for periods and tabs), `ThresholdEditor`, `HistorySection`, `HistoryChart` (bar chart built from views: Lynx has no chart library) and `AlarmHistorySection` ("Recente alarmen": every alarm of the last 24 hours, also resolved and seen ones) |
| `src/hooks/` | `useNow()`: the current time, updated every second, for the buzzer countdown |
| `src/format/` | Turns values from the contract into text (`21,5 °C`, `1 alarm`, ...) readings into chart buckets and min/avg/max (`history.ts`), compares values with the comfort zone (`thresholds.ts`), marks alarm moments in the chart and writes the insight sentence ("Last hour 12 min too warm", `insights.ts`), groups alarms per sensor (`alarmGroups.ts`: the Pi creates a new alarm each time a value crosses a limit again, the app shows one card per sensor), counts down to the buzzer (`buzzer.ts`, same rule as `pi/src/alarms/output.ts`), validates threshold input, including the active hours (`thresholdInput.ts`) and formats the alarm history (`alarmHistory.ts`), with tests |

**Tap handlers that call the Pi must start with `'background only';`.** ReactLynx also runs component code on the main thread, where `fetch` does not exist; the directive removes the handler there. Network code in `useEffect` needs nothing: effects only run on the background thread.

## Talking to the Pi (gRPC)

The app talks to the gRPC server on the Pi with [Connect](https://connectrpc.com/). Everything for that lives in `src/grpc/`:

| File | What |
| --- | --- |
| `client.ts` | `restWell`: the client for normal (unary) RPCs from the contract, e.g. `await restWell.listRooms({})` |
| `watchRoom.ts` | `watchRoom(roomId, signal)`: the live stream `WatchRoom`, read without Connect's stream layer (see below) |
| `envelope.ts` | Splits the stream into Connect messages (envelopes), with tests |
| `readWithTimeout.ts` | Reads the next chunk of the stream, or fails after a timeout. `watchRoom` uses it to fail after 10 s without a message (the Pi sends one every 2 s), so a silently dropped wifi connection is noticed |
| `updateThreshold.ts` | `updateThreshold(threshold)`: saves a changed threshold on the Pi |
| `useThresholds.ts` | `useThresholds(roomId)`: the thresholds (comfort zone) of a room via `ListThresholds`, fetched once |
| `useReadingHistory.ts` | `useReadingHistory(roomId, windowMs, liveReading)`: readings of a period via `ListReadings`, then extended with live readings |
| `useAlarmHistory.ts` | `useAlarmHistory(roomId, windowMs, refreshKey)`: alarm history via `ListAlarms`, fetched again only when a live alarm changes (no polling) |
| `useRoomLive.ts` | `useRoomLive(roomId)`: live readings and open alarms of a room; reconnects after 3 s if the connection drops or stays silent for 10 s |
| `roomState.ts` | How a message from the live stream updates what the app knows, including `newAlarm`: an active alarm the app did not know yet (for the popup) |
| `config.ts` | The server address (`PUBLIC_PI_URL`) |
| `useRooms.ts` | `useRooms()`: all rooms with their number of open alarms, fetched once |
| `useLatestReading.ts` | `useLatestReading(roomId)`: the latest reading, fetched once when a screen opens (until the first live message arrives) |
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
2. Set `PUBLIC_PI_URL` to the IP of the laptop running `npm run dev:fake` in `/pi` (fake readings, find the IP with `ipconfig`), or of the Pi running `npm run dev` (real sensors). `localhost` does not work on a phone.
3. Restart `npm run dev`.

### Test page

`npm run dev` also builds a separate page, `grpc-test.lynx.bundle`, next to the app (`main.lynx.bundle`). Open its URL in Lynx Explorer. It shows:

- which web APIs Lynx has (Connect needs `fetch`, `Headers`, `AbortController`, `ReadableStream`, `BigInt`, `TextEncoder` and `TextDecoder`)
- whether a normal RPC works (`ListRooms`)
- whether live data comes in (`WatchRoom`): a new reading every second with `npm run dev:fake` in `/pi`

### Live data in Lynx

Live data needs `enableFetchAPIStandardStreaming` (set in `lynx.config.ts`), which is experimental and requires Lynx 3.7 or newer. Always test on a real phone: the web preview uses the browser's `fetch`, where streaming always works.

What we measured in Lynx Explorer on an iPhone, and why `watchRoom.ts` exists:

- `fetch` streams fine: chunks arrive as soon as the Pi sends them, as `ArrayBuffer` (not `Uint8Array`).
- **Do not** pass `lynxExtension: { useStreaming: true }`: then no chunks arrive at all.
- `response.body` can be read only once; a second read throws "body used".
- `new ReadableStream({ pull })` never calls `pull`. Connect's stream layer relies on it, so `restWell.watchRoom(...)` hangs. That is why `watchRoom.ts` reads the stream itself and decodes the messages with the generated types.

## Scripts

| Command          | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Starts the dev server with live reload     |
| `npm run build`   | Builds the app for production |
| `npm run generate` | Generates the gRPC types from `/proto` into `src/generated/` |
| `npm test`        | Runs the tests (Rstest) |
| `npm run typecheck` | Checks the types of the app and the config files (`tsc -b`, follows the references in `tsconfig.json`) |
