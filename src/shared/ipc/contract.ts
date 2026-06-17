/**
 * Typed request/response + event contract between the renderer and the main
 * process. The renderer's `api/client.ts` and the main's `ipc/register.ts` both
 * key off these types, so the wire stays in sync at compile time.
 */

import type { BankId, StripField } from '../x32/banks';
import type { ChannelStripValue } from '../model/channelStrip';

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'error';

export interface ConnectionStatus {
  state: ConnectionState;
  message?: string;
  latencyMs?: number;
  model?: string;
  firmware?: string;
  ip?: string;
  simulator: boolean;
}

export interface Settings {
  lastConsoleIp: string;
  consolePort: number;
  /** Port THIS app listens on for Reaper's track-name feedback (Reaper's "Device port"). */
  reaperListenPort: number;
  /** Where Reaper is reachable for the Refresh action (Reaper's "local listen port"). */
  reaperHost: string;
  reaperPort: number;
  simulatorEnabled: boolean;
  simulatorPort: number;
  theme: 'dark' | 'light' | 'system';
}

export type ReaperState = 'stopped' | 'listening' | 'error';

export interface ReaperStatus {
  state: ReaperState;
  message?: string;
  listenPort: number;
  reaperHost: string;
  reaperPort: number;
  trackCount: number;
  lastFeedbackAt: number | null;
  /** Total inbound UDP datagrams seen on the listen port (any address). */
  packetsReceived: number;
  lastInboundAt: number | null;
}

export interface ReaperTrack {
  index: number;
  name: string;
}

/** A single inbound OSC message, for the live diagnostics monitor. */
export interface ReaperMonitorEntry {
  addr: string;
  args: string;
  at: number;
}

export interface ReaperMonitor {
  packetsReceived: number;
  recent: ReaperMonitorEntry[];
}

export interface ReaperSelfTestTarget {
  /** Interface name (e.g. "Ethernet", "vEthernet (WSL)"). */
  label: string;
  ip: string;
  /** Whether a probe sent to this interface reached the listener. */
  received: boolean;
}

/** Result of probing the app's own listener on loopback + every local interface. */
export interface ReaperSelfTest {
  /** Listener received a packet sent to 127.0.0.1 (proves the receive path works). */
  loopback: boolean;
  /** Per-interface reachability — a blocked real-LAN interface usually means a firewall rule. */
  targets: ReaperSelfTestTarget[];
}

export interface AppState {
  settings: Settings;
  connection: ConnectionStatus;
  reaper: ReaperStatus;
}

export interface PushStripResult {
  ok: boolean;
  truncated?: boolean;
}

export interface PushBankResult {
  ok: boolean;
  perStrip: Array<{ index: number; ok: boolean; truncated?: boolean }>;
}

export interface ReadBankResult {
  strips: ChannelStripValue[];
  /** OSC addresses that never replied (UDP loss / unsupported) — shown as "unknown". */
  unresolved: string[];
}

/** Request/response map. `req: void` channels take no payload. */
export interface IpcContract {
  'app:getState': { req: void; res: AppState };
  'console:connect': { req: { ip: string; port?: number }; res: ConnectionStatus };
  'console:disconnect': { req: void; res: ConnectionStatus };
  'console:readBank': {
    req: { bankId: BankId; fields: StripField[] };
    res: ReadBankResult;
  };
  'console:readStrip': {
    req: { bankId: BankId; index: number; fields?: StripField[] };
    res: { strip: ChannelStripValue };
  };
  'console:pushStrip': {
    req: { bankId: BankId; index: number; name?: string; color?: number; icon?: number };
    res: PushStripResult;
  };
  'console:pushBank': {
    req: { bankId: BankId; strips: ChannelStripValue[]; fields?: StripField[] };
    res: PushBankResult;
  };
  'sim:setEnabled': { req: { enabled: boolean }; res: { enabled: boolean } };
  'settings:get': { req: void; res: Settings };
  'settings:set': { req: Partial<Settings>; res: Settings };

  'reaper:connect': {
    req: { listenPort?: number; reaperHost?: string; reaperPort?: number };
    res: ReaperStatus;
  };
  'reaper:disconnect': { req: void; res: ReaperStatus };
  'reaper:refresh': { req: void; res: { ok: boolean; trackCount: number } };
  'reaper:getTracks': { req: void; res: { tracks: ReaperTrack[] } };
  'reaper:installPattern': { req: void; res: { ok: boolean; path: string; error?: string } };
  'reaper:importProject': {
    req: void;
    res: { ok: boolean; path?: string; trackCount: number; tracks: ReaperTrack[]; error?: string };
  };
  'reaper:selfTest': { req: void; res: ReaperSelfTest };
}

export type IpcChannel = keyof IpcContract;

/** Event payloads pushed main → renderer. */
export interface EventContract {
  'console:status': ConnectionStatus;
  'console:changed': {
    bankId: BankId;
    index: number;
    field: StripField;
    value: string | number;
  };
  'reaper:status': ReaperStatus;
  'reaper:tracks': { tracks: ReaperTrack[] };
  'reaper:monitor': ReaperMonitor;
  'log:line': { level: 'info' | 'warn' | 'error'; message: string };
}

export type EventChannel = keyof EventContract;
