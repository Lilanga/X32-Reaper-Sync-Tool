import { BANKS } from '@shared/x32/banks';
import { useChannelStore } from '@renderer/store/useChannelStore';
import { ChannelRow, ROW_COLS } from './ChannelRow';
import { cn } from '@renderer/lib/utils';

export function ChannelGrid() {
  const activeBank = useChannelStore((s) => s.activeBank);
  const bank = BANKS[activeBank];
  const indices = Array.from({ length: bank.count }, (_, i) => i + 1);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card/40">
      <div
        className={cn(
          'grid items-center gap-2 border-b border-border bg-card/70 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground',
          ROW_COLS,
        )}
      >
        <div>#</div>
        <div>Col</div>
        <div>{bank.supportsIcon ? 'Icon' : ''}</div>
        <div>Name</div>
        <div className="pr-1 text-right">Push</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {indices.map((i) => (
          <ChannelRow key={`${activeBank}:${i}`} bankId={activeBank} index={i} />
        ))}
      </div>
    </div>
  );
}
