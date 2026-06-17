import { BANKS } from '@shared/x32/banks';
import { useChannelStore } from '@renderer/store/useChannelStore';
import { ChannelRow } from './ChannelRow';

export function ChannelGrid() {
  const bankId = useChannelStore((s) => s.bankId);
  const count = BANKS[bankId].count;
  const indices = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card/40">
      <div className="grid grid-cols-[2.25rem_1.75rem_2.5rem_1fr_4.75rem] items-center gap-2 border-b border-border bg-card/70 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <div>#</div>
        <div>Col</div>
        <div>Icon</div>
        <div>Name</div>
        <div className="pr-1 text-right">Push</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {indices.map((i) => (
          <ChannelRow key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
