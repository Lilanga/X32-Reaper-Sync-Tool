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
  reaperListenPort: number;
  simulatorEnabled: boolean;
  simulatorPort: number;
  theme: 'dark' | 'light' | 'system';
}

export interface AppState {
  settings: Settings;
  connection: ConnectionStatus;
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
  'log:line': { level: 'info' | 'warn' | 'error'; message: string };
}

export type EventChannel = keyof EventContract;
