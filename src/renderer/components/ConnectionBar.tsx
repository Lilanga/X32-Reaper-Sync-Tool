import { useState } from 'react';
import { SlidersVertical, Power, Download, Upload, Cpu, Radar, Loader2 } from 'lucide-react';

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
  scanForConsoles,
  connectToConsole,
} from '@renderer/api/actions';
import { toast } from '@renderer/store/useToastStore';
import type { ConnectionStatus, DiscoveredConsole } from '@shared/ipc/contract';

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

  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<DiscoveredConsole[]>([]);
  const [showResults, setShowResults] = useState(false);

  const live = isLive(status);
  const connecting = status.state === 'connecting';
  const busy = live || connecting;

  const selectConsole = async (c: DiscoveredConsole): Promise<void> => {
    setShowResults(false);
    toast(`Connecting to ${c.name || c.model || 'X32'} at ${c.ip}…`);
    await connectToConsole(c.ip);
  };

  const onScan = async (): Promise<void> => {
    setScanning(true);
    setShowResults(false);
    try {
      const results = await scanForConsoles();
      setFound(results);
      if (results.length === 0) {
        toast('No X32 found. Check it is powered on and on the same network.', 'warning');
      } else if (results.length === 1) {
        await selectConsole(results[0]);
      } else {
        setShowResults(true);
      }
    } catch {
      toast('Network scan failed', 'error');
    } finally {
      setScanning(false);
    }
  };

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

        <div className="relative flex items-center gap-2">
          <Input
            value={settings.simulatorEnabled ? '127.0.0.1 · simulator' : settings.lastConsoleIp}
            onChange={(e) => patch({ lastConsoleIp: e.target.value })}
            disabled={settings.simulatorEnabled || busy}
            placeholder="Console IP — e.g. 192.168.1.10"
            spellCheck={false}
            className="w-52"
          />
          <Button
            variant="outline"
            onClick={() => void onScan()}
            disabled={scanning || connecting}
            title="Scan the local network for X32 / M32 consoles"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radar className="h-4 w-4" />
            )}
            {scanning ? 'Scanning…' : 'Scan'}
          </Button>

          {showResults && found.length > 0 && (
            <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md border border-border bg-popover p-1 shadow-xl">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] text-muted-foreground">
                <span>{found.length} consoles found</span>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => setShowResults(false)}
                >
                  Close
                </button>
              </div>
              {found.map((c) => (
                <button
                  key={c.ip}
                  type="button"
                  onClick={() => void selectConsole(c)}
                  className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left hover:bg-accent"
                >
                  <span className="text-sm font-medium">{c.name || c.model || 'X32'}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {c.ip}
                    {c.model ? ` · ${c.model}` : ''}
                    {c.firmware ? ` · ${c.firmware}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

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
