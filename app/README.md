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

## Scripts

| Command          | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Starts the dev server with live reload     |
| `npm run build`   | Builds the app for production

Translated with DeepL.com (free version)