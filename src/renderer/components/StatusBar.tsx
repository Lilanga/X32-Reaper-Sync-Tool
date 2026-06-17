import { useConnectionStore } from '@renderer/store/useConnectionStore';
import { useChannelStore } from '@renderer/store/useChannelStore';
import type { ConnectionStatus } from '@shared/ipc/contract';

const STATE_TEXT: Record<ConnectionStatus['state'], string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
  degraded: 'Connection degraded — retrying',
  error: 'Connection error',
};

export function StatusBar() {
  const status = useConnectionStore((s) => s.status);
  const dirty = useChannelStore((s) => Object.values(s.dirty).filter(Boolean).length);
  const unresolved = useChannelStore((s) => s.unresolved.length);

  return (
    <footer className="flex items-center gap-3 border-t border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground">
      <span>{status.message ?? STATE_TEXT[status.state]}</span>
      {dirty > 0 && (
        <span className="text-primary">
          · {dirty} unsaved edit{dirty > 1 ? 's' : ''}
        </span>
      )}
      {unresolved > 0 && <span className="text-amber-500">· {unresolved} channel(s) unread</span>}
      <span className="ml-auto">
        {status.simulator
          ? 'Simulator mode — no real hardware is touched'
          : status.ip
            ? `Console ${status.ip}:10023`
            : 'Connect over Ethernet/Wi-Fi — the X-USB card is audio only'}
      </span>
    </footer>
  );
}
