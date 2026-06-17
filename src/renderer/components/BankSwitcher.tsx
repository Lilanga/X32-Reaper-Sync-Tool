import { cn } from '@renderer/lib/utils';
import { useChannelStore, hasDirtyField } from '@renderer/store/useChannelStore';
import { BANKS, BANK_ORDER } from '@shared/x32/banks';

export function BankSwitcher() {
  const activeBank = useChannelStore((s) => s.activeBank);
  const setActiveBank = useChannelStore((s) => s.setActiveBank);
  const banks = useChannelStore((s) => s.banks);

  return (
    <div className="flex flex-wrap gap-1.5">
      {BANK_ORDER.map((id) => {
        const bank = BANKS[id];
        const active = id === activeBank;
        const dirtyCount = Object.values(banks[id].dirty).filter(hasDirtyField).length;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveBank(id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            {bank.short}
            <span className={cn('tabular-nums', active ? 'opacity-70' : 'opacity-50')}>
              {bank.count}
            </span>
            {dirtyCount > 0 && (
              <span
                className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-primary-foreground' : 'bg-primary')}
                title={`${dirtyCount} unsaved`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
