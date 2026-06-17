import { SlidersVertical, Power, Download, Upload, Cpu } from 'lucide-react';

import { cn } from '@renderer/lib/utils';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Switch } from '@renderer/components/ui/switch';
import { useConnectionStore, isLive } from '@renderer/store/useConnectionStore';
import { useSettingsStore } from '@renderer/store/useSettingsStore';
import {
  connectConsole,
  disconnectConsole,
  setSimulator,
  pullFromConsole,
  pushAll,
} from '@renderer/api/actions';
import type { ConnectionStatus } from '@shared/ipc/contract';

const STATE_LABEL: Record<ConnectionStatus['state'], string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
  degraded: 'Reconnecting…',
  error: 'Connection error',
};

const STATE_DOT: Record<ConnectionStatus['state'], string> = {
  disconnected: 'bg-zinc-500',
  connecting: 'bg-amber-400 animate-pulse',
  connected: 'bg-emerald-500',
  degraded: 'bg-amber-500 animate-pulse',
  error: 'bg-red-500',
};

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2.5 w-2.5 rounded-full', STATE_DOT[status.state])} />
      <div className="text-xs leading-tight">
        <span className="font-medium">{STATE_LABEL[status.state]}</span>
        {status.latencyMs != null && (
          <span className="text-muted-foreground"> · {status.latencyMs} ms</span>
        )}
        {status.model && (
          <span className="text-muted-foreground">
            {' '}
            · {status.model}
            {status.firmware ? ` ${status.firmware}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export function ConnectionBar() {
  const status = useConnectionStore((s) => s.status);
  const settings = useSettingsStore((s) => s.settings);
  const patch = useSettingsStore((s) => s.patch);

  const live = isLive(status);
  const connecting = status.state === 'connecting';
  const busy = live || connecting;

  return (
    <header className="flex items-center gap-3 border-b border-border bg-card/60 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <SlidersVertical className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">X32 · Reaper Sync</div>
          <div className="text-[11px] text-muted-foreground">Channel name sync</div>
        </div>
      </div>

      <div className="mx-1 h-8 w-px bg-border" />
      <StatusIndicator status={status} />

      <div className="ml-auto flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <Switch
            checked={settings.simulatorEnabled}
            onCheckedChange={setSimulator}
            aria-label="Simulator mode"
          />
          <span
            className={cn(
              'flex items-center gap-1',
              settings.simulatorEnabled ? 'font-medium text-primary' : 'text-muted-foreground',
            )}
          >
            <Cpu className="h-3.5 w-3.5" />
            Simulator
          </span>
        </label>

        <Input
          value={settings.simulatorEnabled ? '127.0.0.1 · simulator' : settings.lastConsoleIp}
          onChange={(e) => patch({ lastConsoleIp: e.target.value })}
          disabled={settings.simulatorEnabled || busy}
          placeholder="Console IP — e.g. 192.168.1.10"
          spellCheck={false}
          className="w-56"
        />

        {busy ? (
          <Button variant="outline" onClick={() => void disconnectConsole()}>
            <Power className="h-4 w-4" />
            Disconnect
          </Button>
        ) : (
          <Button onClick={() => void connectConsole()}>
            <Power className="h-4 w-4" />
            Connect
          </Button>
        )}

        <div className="mx-0.5 h-8 w-px bg-border" />

        <Button variant="secondary" onClick={() => void pullFromConsole()} disabled={!live}>
          <Download className="h-4 w-4" />
          Pull names
        </Button>
        <Button onClick={() => void pushAll()} disabled={!live}>
          <Upload className="h-4 w-4" />
          Push all
        </Button>
      </div>
    </header>
  );
}
