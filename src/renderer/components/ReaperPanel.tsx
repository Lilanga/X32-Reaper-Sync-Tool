import { Music2, Plug, RefreshCw, ArrowRightLeft, FolderInput, CircleSlash } from 'lucide-react';

import { cn } from '@renderer/lib/utils';
import { Button } from '@renderer/components/ui/button';
import { useReaperStore, isReaperLive } from '@renderer/store/useReaperStore';
import {
  reaperConnect,
  reaperDisconnect,
  reaperRefresh,
  installReaperPattern,
  applyReaperToGrid,
} from '@renderer/api/actions';
import type { ReaperStatus } from '@shared/ipc/contract';

const STATE_DOT: Record<ReaperStatus['state'], string> = {
  stopped: 'bg-zinc-500',
  listening: 'bg-emerald-500',
  error: 'bg-red-500',
};
const STATE_LABEL: Record<ReaperStatus['state'], string> = {
  stopped: 'Off',
  listening: 'Listening',
  error: 'Error',
};

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
          Device port (Reaper → app): <b>{status.listenPort}</b>; Device IP: this PC
          (<b>127.0.0.1</b> if same machine).
        </li>
        <li>
          Local listen port (app → Reaper): <b>{status.reaperPort}</b>.
        </li>
        <li>
          Pattern config: <b>X32SyncTool.ReaperOSC</b>; tick{' '}
          <b>Allow binding messages to REAPER actions</b>.
        </li>
        <li>
          Back here: <b>Start listening</b> → <b>Refresh</b>.
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
  const live = isReaperLive(status);

  return (
    <aside className="flex w-80 flex-col border-l border-border bg-card/40">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Music2 className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold">REAPER</div>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn('h-2 w-2 rounded-full', STATE_DOT[status.state])} />
          {STATE_LABEL[status.state]}
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
              {tracks.length === 1 ? '' : 's'} received
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

      <div className="flex-1 overflow-y-auto border-t border-border">
        {tracks.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No track names yet. Start listening and click <b>Refresh</b>, or rename a track in
            Reaper.
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
