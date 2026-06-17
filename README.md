# X32 Reaper Sync Tool

A polished cross-platform desktop app for **bulk-editing Behringer X32 / Midas M32 channel names**
(and, soon, colors & icons) and **syncing them from REAPER**. Built for audio engineers who want to
name 32 channels in seconds instead of clicking through scribble-strip menus on the desk.

> **Connection note:** the X32's **X-USB card is audio-only** and cannot carry control data. This
> app talks to the console over its **Ethernet** port using **OSC/UDP on port 10023**, so the X32
> must be reachable on your network (enter its IP). A built-in **Simulator** lets you try everything
> with no hardware.

## Status

**M1 (MVP) complete and verified.** Connect → Pull 32 names → bulk-edit (12-char limit) → Push,
fully working against the built-in simulator and ready to test on real hardware. Reaper sync,
colors/icons, mapping, and packaging are the next milestones — see
`C:\Codebase\Context\X32-Reaper-Sync-Tool\TODO.md`.

## Quick start

```bash
npm install
npm run dev      # launches the app (Simulator mode is on by default)
```

1. Leave **Simulator** toggled on (top-right).
2. Click **Connect** → **Pull names** to load 32 sample channel names.
3. Edit names inline (live `x/12` counter), then **Push all** or use a row's **Push**.
4. To drive a real desk: toggle **Simulator** off, enter the X32's IP, **Connect**.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Run the app with HMR (electron-vite) |
| `npm run build` | Build main/preload/renderer bundles |
| `npm test` | Vitest unit + integration tests |
| `npm run typecheck` | Type-check main + renderer |
| `npm run lint` | ESLint |
| `npm run package:win` / `package:mac` | Build a distributable (electron-builder) |

## Architecture

- **Main process** (`src/main`) — OSC transport over Node `dgram`: `X32Client` (connection
  lifecycle, `/xremote` heartbeat, correlated reads, paced writes), `X32Simulator`, `ServiceHub`,
  zod-validated IPC.
- **Preload** (`src/preload`) — minimal `contextBridge` exposing a typed `window.api`.
- **Renderer** (`src/renderer`) — React + Tailwind UI; Zustand stores; typed IPC client.
- **Shared** (`src/shared`) — isomorphic core: bank descriptor table, OSC address builders,
  color/icon models, name validation, and the IPC contract.

A single **bank descriptor table** (`src/shared/x32/banks.ts`) drives addressing, UI, and validation
for every X32 bank (inputs, aux, FX, bus, matrix, main, DCA), so new banks need no transport changes.

## Tech

Electron · electron-vite · React 18 · TypeScript · Tailwind CSS · Zustand · zod · Vitest ·
electron-builder. OSC is a small, dependency-free, unit-tested codec over UDP.

## License

MIT
