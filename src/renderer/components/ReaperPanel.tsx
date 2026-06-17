import {
  Music2,
  FileUp,
  ArrowRightLeft,
  Plug,
  RefreshCw,
  CircleSlash,
  FolderInput,
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
  importReaperProject,
  reaperSelfTest,
} from '@renderer/api/actions';
import type { ReaperStatus } from '@shared/ipc/contract';

/**
 * Live OSC sync is hidden until the receive path is reliable on the user's
 * network — the .RPP file import is the supported way to pull names today.
 * Flip this back to `true` to restore listening, refresh, setup and diagnostics.
 */
const LIVE_OSC_ENABLED = false;

function ReaperSetup({ status }: { status: ReaperStatus }) {
  return (
    <details className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none py-1 font-medium">How to connect Reaper</summary>
      <ol className="mt-1 list-decimal space-y-1 pl-4">
        <li>Click <b>Install pattern file</b> below, then restart Reaper if it was open.</li>
        <li>Reaper → Preferences → <b>Control/OSC/web</b> → <b>Add</b> → OSC.</li>
        <li>Mode: <b>Configure device IP + local port</b>.</li>
        <li><b>Device port</b> (Reaper → app): <b>{status.listenPort}</b></li>
        <li>
          <b>Device IP</b> and <b>Local IP</b> must be the same interface (both 127.0.0.1, or both
          your LAN IP).
        </li>
        <li><b>Local listen port</b> (app → Reaper): <b>{status.reaperPort}</b></li>
        <li>Pattern config: <b>X32SyncTool.ReaperOSC</b>; tick <b>Allow binding messages to REAPER actions</b>.</li>
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
  const selfTest = useReaperStore((s) => s.selfTest);

  const live = isReaperLive(status);
  const receiving = monitor.packetsReceived > 0;
  const liveDot =
    status.state === 'error'
      ? 'bg-red-500'
      : status.state === 'stopped'
        ? 'bg-zinc-500'
        : receiving
          ? 'bg-emerald-500'
          : 'bg-amber-400 animate-pulse';
  const liveLabel =
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
        <div className="leading-tight">
          <div className="text-sm font-semibold">Reaper Project</div>
          <div className="text-[11px] text-muted-foreground">Import track names</div>
        </div>
        {LIVE_OSC_ENABLED && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('h-2 w-2 rounded-full', liveDot)} />
            {liveLabel}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3">
        <Button onClick={() => void importReaperProject()}>
          <FileUp className="h-4 w-4" />
          Import .RPP names
        </Button>
        <Button variant="secondary" disabled={!tracks.length} onClick={() => applyReaperToGrid()}>
          <ArrowRightLeft className="h-4 w-4" />
          Apply names → channels
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {tracks.length
            ? `${tracks.length} track${tracks.length === 1 ? '' : 's'} loaded — names applied to channels.`
            : 'Load a Reaper .rpp project to pull track names straight into the grid.'}
        </p>
      </div>

      {LIVE_OSC_ENABLED && (
        <>
          <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
            <div className="text-[11px] font-medium text-muted-foreground">Live sync (optional)</div>
            {live ? (
              <>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => void reaperRefresh()}>
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={() => void reaperDisconnect()} title="Stop listening">
                    <CircleSlash className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Listening on UDP {status.listenPort} · {monitor.packetsReceived} packet
                  {monitor.packetsReceived === 1 ? '' : 's'} received
                </p>
              </>
            ) : (
              <Button variant="outline" onClick={() => void reaperConnect()}>
                <Plug className="h-4 w-4" />
                Start listening
              </Button>
            )}
          </div>

          <ReaperSetup status={status} />

          <details className="border-t border-border px-4 py-2 text-xs" open={live && !tracks.length}>
            <summary className="cursor-pointer select-none py-1 font-medium text-muted-foreground">
              Diagnostics
            </summary>
            <div className="mt-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">OSC packets received</span>
                <span
                  className={cn('font-semibold tabular-nums', receiving ? 'text-emerald-400' : 'text-amber-400')}
                >
                  {monitor.packetsReceived}
                </span>
              </div>
              <Button size="sm" variant="outline" className="w-full" disabled={!live} onClick={() => void reaperSelfTest()}>
                <Activity className="h-3.5 w-3.5" />
                Run self-test
              </Button>
              {selfTest && (
                <div className="space-y-1 rounded border border-border bg-background/40 p-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>loopback · 127.0.0.1</span>
                    <span className={cn('font-semibold', selfTest.loopback ? 'text-emerald-400' : 'text-red-400')}>
                      {selfTest.loopback ? 'OK' : 'BLOCKED'}
                    </span>
                  </div>
                  {selfTest.targets.map((t) => (
                    <div key={t.ip} className="flex items-center justify-between gap-2">
                      <span className="truncate" title={t.label}>
                        {t.ip}
                      </span>
                      <span className={cn('font-semibold', t.received ? 'text-emerald-400' : 'text-red-400')}>
                        {t.received ? 'OK' : 'BLOCKED'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </>
      )}

      <div className="flex-1 overflow-y-auto border-t border-border">
        {tracks.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No tracks loaded yet. Click <b>Import .RPP names</b> and choose a Reaper project file.
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
