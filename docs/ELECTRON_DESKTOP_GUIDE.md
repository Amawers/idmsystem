# Electron Desktop Guide

This document explains how to run the IDM System as a desktop application using Electron.

## Project Layout

```
/electron
   main.js        # Electron main process entry (window + lifecycle)
   preload.cjs    # Minimal preload that exposes safe APIs
/src/lib/electronBridge.js # Renderer helper that no-ops in the browser
```

## Development

1. Install dependencies (includes Electron dev tooling):
   ```bash
   npm install
   ```
2. Start the desktop dev environment (Vite + Electron):
   ```bash
   npm run dev
   ```
   - Spins up Vite on `http://localhost:5173`.
   - Waits for the renderer, then boots Electron with that URL.
   - Opens DevTools automatically; close them if undesired.

### Renderer-only mode
If you still need the plain web client, run:
```bash
npm run dev:renderer
```
This skips Electron and behaves like the previous Vite-only workflow.

### Offline Login Cache

Use the "Remember me for offline access" checkbox on the login screen while you are online at least once. The app stores a 7-day session snapshot so you can reopen the Electron build without connectivity and continue working against cached data.

## Building

1. Build the renderer:
   ```bash
   npm run build
   ```
2. Package desktop installers/binaries for the current OS:
   ```bash
   npm run build:electron
   ```
   Artifacts are produced under `dist/` (renderer bundle) and `dist_electron/` by electron-builder.

## Environment Variables

Electron reuses the existing Vite `.env` config. Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` are defined before running dev/build.

## Using the Preload Bridge

`electron/preload.cjs` exposes a minimal API so the renderer can interact with the host securely:

```javascript
contextBridge.exposeInMainWorld("electronAPI", {
	getAppVersion: () => ipcRenderer.invoke("app:get-version"),
});
```

In React code, import the bridge helper to guard against the browser fallback:

```javascript
import electronBridge from "@/lib/electronBridge";

const fetchVersion = async () => {
	const version = await electronBridge.getAppVersion();
	console.log(version);
};
```

When running as a standard web app the helper returns a harmless stub, so the rest of the UI does not need to branch manually.

## Packaging Targets

The `electron-builder` config in `package.json` produces installers for macOS (dmg/zip), Windows (nsis/zip), and Linux (AppImage/tar.gz). Adjust the `build` section if you need platform-specific tweaks (icons, signing, etc.).
