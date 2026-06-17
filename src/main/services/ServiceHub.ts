/**
 * Wires the OSC client + simulator together, owns the in-memory settings, and
 * forwards client events to the renderer. IPC handlers call into this hub.
 * (Settings persistence with electron-store arrives in M6.)
 */

import { X32Client, type PushStripRequest } from './osc/X32Client';
import { X32Simulator } from './simulator/X32Simulator';
import { ReaperService } from './reaper/ReaperService';
import { installReaperPattern } from './reaper/reaperPaths';
import { EVENTS } from '@shared/ipc/channels';
import type { BankId, StripField } from '@shared/x32/banks';
import type { ChannelStripValue } from '@shared/model/channelStrip';
import type {
  AppState,
  ConnectionStatus,
  PushBankResult,
  PushStripResult,
  ReadBankResult,
  ReaperMonitor,
  ReaperStatus,
  ReaperTrack,
  Settings,
} from '@shared/ipc/contract';
import { logger } from '../util/logger';

export type Sender = (channel: string, payload: unknown) => void;

function defaultSettings(): Settings {
  return {
    lastConsoleIp: '',
    consolePort: 10023,
    reaperListenPort: 9000,
    reaperHost: '127.0.0.1',
    reaperPort: 8000,
    simulatorEnabled: true,
    simulatorPort: 10023,
    theme: 'dark',
  };
}

export class ServiceHub {
  readonly client = new X32Client();
  readonly reaper = new ReaperService();
  private simulator: X32Simulator | null = null;
  private settings: Settings = defaultSettings();

  constructor(private readonly send: Sender) {
    this.client.on('status', (status: ConnectionStatus) => this.send(EVENTS.consoleStatus, status));
    this.client.on('changed', (change) => this.send(EVENTS.consoleChanged, change));
    this.client.on('log', (line: { level: 'info' | 'warn' | 'error'; message: string }) => {
      logger.log(`[x32] ${line.message}`);
      this.send(EVENTS.logLine, line);
    });

    this.reaper.on('status', (status: ReaperStatus) => this.send(EVENTS.reaperStatus, status));
    this.reaper.on('tracks', (tracks: ReaperTrack[]) =>
      this.send(EVENTS.reaperTracks, { tracks }),
    );
    this.reaper.on('monitor', (monitor: ReaperMonitor) =>
      this.send(EVENTS.reaperMonitor, monitor),
    );
    this.reaper.on('log', (line: { level: 'info' | 'warn' | 'error'; message: string }) => {
      logger.log(`[reaper] ${line.message}`);
      this.send(EVENTS.logLine, line);
    });
  }

  getState(): AppState {
    return {
      settings: this.settings,
      connection: this.client.getStatus(),
      reaper: this.reaper.getStatus(),
    };
  }

  getSettings(): Settings {
    return this.settings;
  }

  setSettings(patch: Partial<Settings>): Settings {
    this.settings = { ...this.settings, ...patch };
    return this.settings;
  }

  setSimEnabled(enabled: boolean): { enabled: boolean } {
    this.settings.simulatorEnabled = enabled;
    if (!enabled && this.simulator) this.simulator.stop();
    return { enabled };
  }

  async connect(req: { ip: string; port?: number }): Promise<ConnectionStatus> {
    if (this.settings.simulatorEnabled) {
      try {
        await this.ensureSimulator();
      } catch {
        return {
          state: 'error',
          message: 'Could not start the built-in simulator (is port 10023 already in use?).',
          simulator: true,
        };
      }
      return this.client.connect('127.0.0.1', this.settings.simulatorPort, true);
    }
    if (req.ip) this.settings.lastConsoleIp = req.ip;
    return this.client.connect(req.ip, req.port ?? this.settings.consolePort, false);
  }

  disconnect(): ConnectionStatus {
    this.client.disconnect();
    return this.client.getStatus();
  }

  readBank(req: { bankId: BankId; fields: StripField[] }): Promise<ReadBankResult> {
    return this.client.readBank(req.bankId, req.fields);
  }

  readStrip(req: { bankId: BankId; index: number; fields?: StripField[] }): Promise<{
    strip: ChannelStripValue;
  }> {
    return this.client.readStrip(req.bankId, req.index, req.fields);
  }

  pushStrip(req: PushStripRequest): PushStripResult {
    return this.client.pushStrip(req);
  }

  pushBank(req: {
    bankId: BankId;
    strips: ChannelStripValue[];
    fields?: StripField[];
  }): PushBankResult {
    return this.client.pushBank(req.bankId, req.strips, req.fields);
  }

  reaperConnect(req: {
    listenPort?: number;
    reaperHost?: string;
    reaperPort?: number;
  }): Promise<ReaperStatus> {
    const listenPort = req.listenPort ?? this.settings.reaperListenPort;
    const reaperHost = req.reaperHost ?? this.settings.reaperHost;
    const reaperPort = req.reaperPort ?? this.settings.reaperPort;
    this.settings = { ...this.settings, reaperListenPort: listenPort, reaperHost, reaperPort };
    return this.reaper.start({ listenPort, reaperHost, reaperPort });
  }

  reaperDisconnect(): ReaperStatus {
    this.reaper.stop();
    return this.reaper.getStatus();
  }

  reaperRefresh(): { ok: boolean; trackCount: number } {
    return this.reaper.refresh();
  }

  reaperGetTracks(): { tracks: ReaperTrack[] } {
    return { tracks: this.reaper.getTracks() };
  }

  reaperInstallPattern(): Promise<{ ok: boolean; path: string; error?: string }> {
    return installReaperPattern();
  }

  private async ensureSimulator(): Promise<void> {
    if (!this.simulator) this.simulator = new X32Simulator(this.settings.simulatorPort);
    await this.simulator.start();
  }

  dispose(): void {
    this.client.disconnect(true);
    this.reaper.stop(true);
    this.simulator?.stop();
  }
}
