import {
  Music2,
  Plug,
  RefreshCw,
  ArrowRightLeft,
  FolderInput,
  CircleSlash,
  Activity,
} from 'lucide-react';

import { cn } from '@renderer/lib/utils';
import { Button } from '@renderer/components/ui/button';
import { useReaperStore, isReaperLive } from '@renderer/store/useReaperStore';
import {
  reaperConnect,
  reaperDisconnect,
  reaperRefresh,
  installReaperPattern,
  applyReaperToGrid,
  reaperSelfTest,
} from '@renderer/api/actions';
import type { ReaperStatus } from '@shared/ipc/contract';

function ReaperSetup({ status }: { status: ReaperStatus }) {
  return (
    <details className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none py-1 font-medium">How to connect Reaper</summary>
      <ol className="mt-1 list-decimal space-y-1 pl-4">
        <li>
          Click <b>Install pattern file</b> below, then restart Reaper if it was open.
        </li>
        <li>
          Reaper → Preferences → <b>Control/OSC/web</b> → <b>Add</b> → OSC.
        </li>
        <li>
          Mode: <b>Configure device IP + local port</b>.
        </li>
        <li>
          <b>Device port</b> (Reaper → app): <b>{status.listenPort}</b>
        </li>
        <li>
          <b>Device IP</b> and <b>Local IP</b> must be the same interface. On one PC set both to{' '}
          <b>127.0.0.1</b>; if Reaper auto-filled Local IP with a LAN address, set Device IP to that
          same address (mismatched IPs = no packets).
        </li>
        <li>
          <b>Local listen port</b> (app → Reaper): <b>{status.reaperPort}</b>
        </li>
        <li>
          Pattern config: <b>X32SyncTool.ReaperOSC</b>; tick{' '}
          <b>Allow binding messages to REAPER actions</b>.
        </li>
        <li>
          Back here: <b>Start listening</b> → <b>Refresh</b> (or just rename a track in Reaper).
        </li>
      </ol>
      <Button
        size="sm"
        variant="outline"
        className="mt-2 w-full"
        onClick={() => void installReaperPattern()}
      >
        <FolderInput className="h-3.5 w-3.5" />
        Install pattern file
      </Button>
    </details>
  );
}

export function ReaperPanel() {
  const status = useReaperStore((s) => s.status);
  const tracks = useReaperStore((s) => s.tracks);
  const monitor = useReaperStore((s) => s.monitor);
  const live = isReaperLive(status);
  const receiving = monitor.packetsReceived > 0;

  const dot =
    status.state === 'error'
      ? 'bg-red-500'
      : status.state === 'stopped'
        ? 'bg-zinc-500'
        : receiving
          ? 'bg-emerald-500'
          : 'bg-amber-400 animate-pulse';
  const label =
    status.state === 'error'
      ? 'Error'
      : status.state === 'stopped'
        ? 'Off'
        : receiving
          ? 'Receiving'
          : 'Listening';

  return (
    <aside className="flex w-80 flex-col border-l border-border bg-card/40">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Music2 className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold">REAPER</div>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn('h-2 w-2 rounded-full', dot)} />
          {label}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {live ? (
          <>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void reaperRefresh()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => void reaperDisconnect()}
                title="Stop listening"
              >
                <CircleSlash className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="secondary"
              disabled={!tracks.length}
              onClick={() => applyReaperToGrid()}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Apply names → channels
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Listening on UDP {status.listenPort} · {tracks.length} track
              {tracks.length === 1 ? '' : 's'} · {monitor.packetsReceived} packet
              {monitor.packetsReceived === 1 ? '' : 's'} received
            </p>
          </>
        ) : (
          <>
            <Button onClick={() => void reaperConnect()}>
              <Plug className="h-4 w-4" />
              Start listening
            </Button>
            {status.state === 'error' && (
              <p className="text-[11px] text-red-400">{status.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Listens on UDP {status.listenPort} for track names from a running Reaper.
            </p>
          </>
        )}
      </div>

      <ReaperSetup status={status} />

      <details
        className="border-t border-border px-4 py-2 text-xs"
        open={live && !tracks.length}
      >
        <summary className="cursor-pointer select-none py-1 font-medium text-muted-foreground">
          Diagnostics
        </summary>
        <div className="mt-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">OSC packets received</span>
            <span
              className={cn(
                'font-semibold tabular-nums',
                receiving ? 'text-emerald-400' : 'text-amber-400',
              )}
            >
              {monitor.packetsReceived}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={!live}
            onClick={() => void reaperSelfTest()}
          >
            <Activity className="h-3.5 w-3.5" />
            Run self-test (is the app reachable?)
          </Button>
          {live && !receiving && (
            <p className="text-[11px] text-amber-400/90">
              Nothing from Reaper yet. Rename a track in Reaper to test — if this stays 0, Reaper
              isn&apos;t reaching the app (check Device port = {status.listenPort}, Device IP =
              127.0.0.1).
            </p>
          )}
          {monitor.recent.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded border border-border bg-background/50 p-1 font-mono text-[10px] leading-relaxed">
              {monitor.recent.map((e, i) => (
                <div key={i} className="truncate">
                  <span className="text-primary">{e.addr}</span>
                  {e.args && <span className="text-muted-foreground"> {e.args}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      <div className="flex-1 overflow-y-auto border-t border-border">
        {tracks.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No track names yet. Start listening, then <b>rename a track in Reaper</b> or click{' '}
            <b>Refresh</b>.
          </div>
        ) : (
          tracks.map((t) => (
            <div
              key={t.index}
              className="flex items-center gap-2 border-b border-border/40 px-4 py-1.5 text-sm"
            >
              <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">
                {t.index}
              </span>
              <span className={cn('truncate', t.name.trim() === '' && 'text-muted-foreground')}>
                {t.name.trim() === '' ? '—' : t.name}
              </span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
